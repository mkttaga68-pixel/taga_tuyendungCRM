import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Queue, Worker, type Job } from "bullmq";
import {
  AUTOMATION_QUEUE_NAME,
  REPORTS_ROLLUP_QUEUE_NAME,
  type AutomationJobData,
  type ReportsRollupJobData,
} from "@taga-crm/shared";
import { createRedisConnection } from "./redis-connection";
import { prisma } from "./prisma";
import { runWorkflowJob } from "./automation/engine";
import { runDailyRollup } from "./reports/rollup-job";
import { SYSTEM_QUEUE_NAME, type PingJobData, type PingJobResult } from "./queues/system.queue";

// apps/worker dùng chung 1 file .env với apps/api (REDIS_URL/DATABASE_URL/...)
// — load rõ ràng bằng API built-in của Node, không phụ thuộc biến môi trường
// có sẵn từ shell (dễ vỡ, không tái lập được khi deploy thật).
const SHARED_ENV_PATH = resolve(__dirname, "../../api/.env");
if (existsSync(SHARED_ENV_PATH)) {
  process.loadEnvFile(SHARED_ENV_PATH);
}

const connection = createRedisConnection();

const systemWorker = new Worker<PingJobData, PingJobResult>(
  SYSTEM_QUEUE_NAME,
  async (job: Job<PingJobData>) => {
    console.log(`[worker] xử lý job "${job.name}" (id=${job.id}), data=`, job.data);
    return { pong: true, respondedAt: new Date().toISOString() };
  },
  { connection },
);

/**
 * Sprint 5: Automation Engine — queue "automation" nhận job từ apps/api mỗi khi
 * trigger khớp (RECORD_CREATED/FIELD_CHANGED) hoặc Test Run thủ công, hoặc job
 * tự "resume" sau DELAY/WAIT (xem engine.ts). Dùng connection riêng cho Queue
 * producer (cần để chính worker tự enqueue job resume), tách khỏi Worker consumer.
 */
const automationQueue = new Queue<AutomationJobData>(AUTOMATION_QUEUE_NAME, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 200 },
  },
});

const automationWorker = new Worker<AutomationJobData>(
  AUTOMATION_QUEUE_NAME,
  async (job: Job<AutomationJobData>) => {
    console.log(`[worker] automation run=${job.data.runId} workflow=${job.data.workflowId}`);
    await runWorkflowJob(job.data, prisma, automationQueue);
  },
  { connection },
);

/**
 * Sprint 7: rollup KPI ngày — cron 01:00 hằng ngày (giờ UTC) cho ngày hôm
 * trước, cộng thêm cho phép trigger thủ công qua POST /reports/rollup/run
 * (backfill/test). `jobId` cố định để BullMQ không tạo trùng lịch repeat
 * mỗi lần worker restart.
 */
const reportsQueue = new Queue<ReportsRollupJobData>(REPORTS_ROLLUP_QUEUE_NAME, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: { count: 30 },
    removeOnFail: { count: 30 },
  },
});
void reportsQueue.add(
  "daily-rollup",
  {},
  { repeat: { pattern: "0 1 * * *" }, jobId: "daily-rollup-schedule" },
);

const reportsWorker = new Worker<ReportsRollupJobData>(
  REPORTS_ROLLUP_QUEUE_NAME,
  async (job: Job<ReportsRollupJobData>) => {
    console.log(`[worker] reports-rollup job="${job.name}" targetDate=${job.data.targetDate ?? "(hôm qua)"}`);
    await runDailyRollup(prisma, job.data.targetDate);
  },
  { connection },
);

systemWorker.on("ready", () => {
  console.log(`[worker] Đã kết nối Redis, đang lắng nghe queue "${SYSTEM_QUEUE_NAME}"`);
});
systemWorker.on("failed", (job, error) => {
  console.error(`[worker] Job ${job?.id} thất bại:`, error);
});
systemWorker.on("error", (err) => {
  console.error("[worker] System worker Redis error:", err);
});

automationWorker.on("ready", () => {
  console.log(`[worker] Đã kết nối Redis, đang lắng nghe queue "${AUTOMATION_QUEUE_NAME}"`);
});
automationWorker.on("failed", (job, error) => {
  console.error(`[worker] Automation job ${job?.id} thất bại:`, error);
  // Nếu engine.ts không mark được FAILED (DB lỗi khi rethrow), cố cập nhật ở đây
  const runId = job?.data?.runId;
  if (runId) {
    void prisma.automationRun.update({
      where: { id: runId },
      data: { status: "FAILED", finishedAt: new Date(), errorMessage: error.message },
    }).catch((dbErr: unknown) => {
      console.error(`[worker] Không thể đánh dấu run ${runId} FAILED:`, dbErr);
    });
  }
});
automationWorker.on("error", (err) => {
  console.error("[worker] Automation worker Redis error:", err);
});

reportsWorker.on("ready", () => {
  console.log(`[worker] Đã kết nối Redis, đang lắng nghe queue "${REPORTS_ROLLUP_QUEUE_NAME}"`);
});
reportsWorker.on("failed", (job, error) => {
  console.error(`[worker] Reports rollup job ${job?.id} thất bại:`, error);
});
reportsWorker.on("error", (err) => {
  console.error("[worker] Reports worker Redis error:", err);
});

async function shutdown(signal: string) {
  console.log(`[worker] Nhận ${signal}, đang đóng kết nối...`);
  await systemWorker.close();
  await automationWorker.close();
  await automationQueue.close();
  await reportsWorker.close();
  await reportsQueue.close();
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

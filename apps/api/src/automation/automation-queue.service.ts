import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { AUTOMATION_QUEUE_NAME, type AutomationJobData } from "@taga-crm/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AutomationQueueService implements OnModuleDestroy {
  private readonly connection: IORedis;
  private readonly queue: Queue<AutomationJobData>;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const url = this.configService.get<string>("REDIS_URL");
    if (!url) throw new Error("REDIS_URL chưa được khai báo");
    this.connection = new IORedis(url, { maxRetriesPerRequest: null });
    this.queue = new Queue<AutomationJobData>(AUTOMATION_QUEUE_NAME, {
      connection: this.connection,
    });
  }

  /** Tạo AutomationRun (status RUNNING) rồi đẩy job cho worker xử lý graph. */
  async enqueueRun(
    workflowId: string,
    triggerRecordTable: string,
    triggerRecordId: string | null,
  ): Promise<string> {
    const run = await this.prisma.automationRun.create({
      data: { workflowId, triggerRecordTable, triggerRecordId, status: "RUNNING" },
    });
    await this.queue.add("run", {
      runId: run.id,
      workflowId,
      triggerRecordTable,
      triggerRecordId,
    });
    return run.id;
  }

  /** Enqueue cho mọi workflow ACTIVE khớp triggerType=RECORD_CREATED trên bảng candidates. */
  async fireRecordCreated(table: string, recordId: string): Promise<void> {
    const workflows = await this.prisma.automationWorkflow.findMany({
      where: { isActive: true, triggerType: "RECORD_CREATED" },
    });
    for (const wf of workflows) {
      await this.enqueueRun(wf.id, table, recordId);
    }
  }

  /** Enqueue cho workflow ACTIVE khớp triggerType=FIELD_CHANGED — nếu triggerConfig.fieldKey có
   * khai báo, chỉ chạy khi field đó nằm trong danh sách field vừa đổi. */
  async fireFieldChanged(
    table: string,
    recordId: string,
    changedFieldKeys: string[],
  ): Promise<void> {
    if (changedFieldKeys.length === 0) return;
    const workflows = await this.prisma.automationWorkflow.findMany({
      where: { isActive: true, triggerType: "FIELD_CHANGED" },
    });
    for (const wf of workflows) {
      const config = wf.triggerConfig as Record<string, unknown> | null;
      const fieldKey = typeof config?.fieldKey === "string" ? config.fieldKey : null;
      if (!fieldKey || changedFieldKeys.includes(fieldKey)) {
        await this.enqueueRun(wf.id, table, recordId);
      }
    }
  }

  async triggerManualRun(workflowId: string, candidateId: string): Promise<string> {
    return this.enqueueRun(workflowId, "candidates", candidateId);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}

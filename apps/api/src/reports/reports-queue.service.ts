import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { REPORTS_ROLLUP_QUEUE_NAME, type ReportsRollupJobData } from "@taga-crm/shared";

@Injectable()
export class ReportsQueueService implements OnModuleDestroy {
  private readonly connection: IORedis;
  private readonly queue: Queue<ReportsRollupJobData>;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>("REDIS_URL");
    if (!url) throw new Error("REDIS_URL chưa được khai báo");
    this.connection = new IORedis(url, { maxRetriesPerRequest: null });
    this.queue = new Queue<ReportsRollupJobData>(REPORTS_ROLLUP_QUEUE_NAME, {
      connection: this.connection,
    });
  }

  /** Trigger thủ công 1 lần rollup (backfill/test) — không chờ cron 01:00 hằng ngày. */
  async triggerRollup(targetDate?: string): Promise<void> {
    await this.queue.add("manual-rollup", { targetDate });
  }

  async onModuleDestroy() {
    await this.queue.close();
    await this.connection.quit();
  }
}

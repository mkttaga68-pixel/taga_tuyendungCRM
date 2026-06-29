import { Module } from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { ReportsQueueService } from "./reports-queue.service";
import { ReportsController } from "./reports.controller";

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportsQueueService],
})
export class ReportsModule {}

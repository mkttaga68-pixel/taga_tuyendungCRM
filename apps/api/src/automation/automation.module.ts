import { Module } from "@nestjs/common";
import { AutomationController } from "./automation.controller";
import { AutomationWorkflowsService } from "./automation-workflows.service";
import { AutomationRunsService } from "./automation-runs.service";
import { AutomationQueueService } from "./automation-queue.service";

@Module({
  controllers: [AutomationController],
  providers: [AutomationWorkflowsService, AutomationRunsService, AutomationQueueService],
  exports: [AutomationQueueService],
})
export class AutomationModule {}

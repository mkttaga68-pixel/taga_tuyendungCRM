import { Module } from "@nestjs/common";
import { CandidatesController } from "./candidates.controller";
import { CandidatesService } from "./candidates.service";
import { CandidateMatchingService } from "./candidate-matching.service";
import { ComputeFieldsService } from "./compute-fields.service";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { StorageModule } from "../storage/storage.module";
import { AutomationModule } from "../automation/automation.module";

@Module({
  imports: [AuditLogModule, StorageModule, AutomationModule],
  controllers: [CandidatesController],
  providers: [CandidatesService, CandidateMatchingService, ComputeFieldsService],
  exports: [CandidatesService, CandidateMatchingService],
})
export class CandidatesModule {}

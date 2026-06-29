import { Module } from "@nestjs/common";
import { CvAttachmentsController } from "./cv-attachments.controller";
import { CvAttachmentsService } from "./cv-attachments.service";
import { StorageModule } from "../storage/storage.module";
import { CandidatesModule } from "../candidates/candidates.module";

@Module({
  imports: [StorageModule, CandidatesModule],
  controllers: [CvAttachmentsController],
  providers: [CvAttachmentsService],
})
export class CvAttachmentsModule {}

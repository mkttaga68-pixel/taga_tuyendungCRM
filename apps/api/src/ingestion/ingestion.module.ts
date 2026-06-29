import { Module } from "@nestjs/common";
import { IngestionController } from "./ingestion.controller";
import { IngestionService } from "./ingestion.service";
import { FacebookCapiService } from "./facebook-capi.service";
import { LandingPagesModule } from "../landing-pages/landing-pages.module";
import { CandidatesModule } from "../candidates/candidates.module";

@Module({
  imports: [LandingPagesModule, CandidatesModule],
  controllers: [IngestionController],
  providers: [IngestionService, FacebookCapiService],
})
export class IngestionModule {}

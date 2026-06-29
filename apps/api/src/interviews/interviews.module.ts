import { Module } from "@nestjs/common";
import { InterviewsController, CandidateInterviewsController } from "./interviews.controller";
import { InterviewsService } from "./interviews.service";
import { CandidatesModule } from "../candidates/candidates.module";
import { GoogleIntegrationModule } from "../integrations/google/google-integration.module";

@Module({
  imports: [CandidatesModule, GoogleIntegrationModule],
  controllers: [InterviewsController, CandidateInterviewsController],
  providers: [InterviewsService],
})
export class InterviewsModule {}

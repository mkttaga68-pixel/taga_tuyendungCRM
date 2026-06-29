import { Module } from "@nestjs/common";
import { CommentsController } from "./comments.controller";
import { CommentsService } from "./comments.service";
import { CandidatesModule } from "../candidates/candidates.module";

@Module({
  imports: [CandidatesModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}

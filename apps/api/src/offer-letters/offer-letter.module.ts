import { Module } from "@nestjs/common";
import { OfferLetterController } from "./offer-letter.controller";
import { OfferLetterService } from "./offer-letter.service";
import { CandidatesModule } from "../candidates/candidates.module";

@Module({
  imports: [CandidatesModule],
  controllers: [OfferLetterController],
  providers: [OfferLetterService],
})
export class OfferLetterModule {}

import { Module } from "@nestjs/common";
import { LandingPagesService } from "./landing-pages.service";
import { LandingPageFormsService } from "./landing-page-forms.service";
import { LandingPagesController } from "./landing-pages.controller";

@Module({
  controllers: [LandingPagesController],
  providers: [LandingPagesService, LandingPageFormsService],
  exports: [LandingPagesService, LandingPageFormsService],
})
export class LandingPagesModule {}

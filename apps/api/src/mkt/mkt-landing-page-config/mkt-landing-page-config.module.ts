import { Module } from "@nestjs/common";
import { MktLandingPageConfigController } from "./mkt-landing-page-config.controller";
import { MktLandingPageConfigService } from "./mkt-landing-page-config.service";

@Module({
  controllers: [MktLandingPageConfigController],
  providers: [MktLandingPageConfigService],
  exports: [MktLandingPageConfigService],
})
export class MktLandingPageConfigModule {}

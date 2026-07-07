import { Module } from "@nestjs/common";
import { MktCampaignsController } from "./mkt-campaigns.controller";
import { MktCampaignsService } from "./mkt-campaigns.service";

@Module({
  controllers: [MktCampaignsController],
  providers: [MktCampaignsService],
  exports: [MktCampaignsService],
})
export class MktCampaignsModule {}

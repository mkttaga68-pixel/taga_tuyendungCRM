import { Module } from "@nestjs/common";
import { MktDashboardController } from "./mkt-dashboard.controller";
import { MktDashboardService } from "./mkt-dashboard.service";

@Module({
  controllers: [MktDashboardController],
  providers: [MktDashboardService],
})
export class MktDashboardModule {}

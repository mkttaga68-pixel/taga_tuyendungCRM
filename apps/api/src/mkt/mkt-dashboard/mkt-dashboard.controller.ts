import { Controller, Get, UseGuards } from "@nestjs/common";
import { MktDashboardService } from "./mkt-dashboard.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@Controller("mkt/dashboard")
@UseGuards(JwtAuthGuard)
export class MktDashboardController {
  constructor(private readonly service: MktDashboardService) {}

  @Get()
  getStats() {
    return this.service.getStats();
  }
}

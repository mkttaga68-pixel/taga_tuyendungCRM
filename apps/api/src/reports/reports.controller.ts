import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import {
  reportLeaderboardQuerySchema,
  reportOverviewQuerySchema,
  triggerRollupSchema,
  type ReportLeaderboardQuery,
  type ReportOverviewQuery,
  type TriggerRollupInput,
} from "@taga-crm/shared";
import { ReportsService } from "./reports.service";
import { ReportsQueueService } from "./reports-queue.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("reports")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "HR_MANAGER")
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportsQueueService: ReportsQueueService,
  ) {}

  @Get("overview")
  overview(@Query(new ZodValidationPipe(reportOverviewQuerySchema)) query: ReportOverviewQuery) {
    return this.reportsService.getOverview(query);
  }

  @Get("leaderboard")
  leaderboard(
    @Query(new ZodValidationPipe(reportLeaderboardQuerySchema)) query: ReportLeaderboardQuery,
  ) {
    return this.reportsService.getLeaderboard(query);
  }

  @Post("rollup/run")
  async runRollup(@Body(new ZodValidationPipe(triggerRollupSchema)) body: TriggerRollupInput) {
    await this.reportsQueueService.triggerRollup(body.date);
    return { success: true };
  }
}

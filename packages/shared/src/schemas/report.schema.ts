import { z } from "zod";
import { REPORT_GROUP_BY, REPORT_LEADERBOARD_TYPES } from "../enums/report.enum";

export const reportOverviewQuerySchema = z.object({
  dateFrom: z.string().date("Ngày bắt đầu không hợp lệ"),
  dateTo: z.string().date("Ngày kết thúc không hợp lệ"),
  groupBy: z.enum(REPORT_GROUP_BY).default("day"),
  landingPageId: z.string().uuid().optional(),
});
export type ReportOverviewQuery = z.infer<typeof reportOverviewQuerySchema>;

export interface ReportSeriesPointDto {
  bucket: string;
  formSubmits: number;
  hires: number;
  cost: number;
  visitors: number;
  sessions: number;
  pageViews: number;
}

export interface ReportOverviewDto {
  totals: {
    formSubmits: number;
    hires: number;
    cost: number;
    costPerForm: number;
    costPerHire: number;
    visitors: number;
    sessions: number;
    pageViews: number;
    bounceRate: number;
    avgTimeSeconds: number;
  };
  series: ReportSeriesPointDto[];
  ga4Configured: boolean;
}

export const reportLeaderboardQuerySchema = z.object({
  type: z.enum(REPORT_LEADERBOARD_TYPES),
  dateFrom: z.string().date("Ngày bắt đầu không hợp lệ"),
  dateTo: z.string().date("Ngày kết thúc không hợp lệ"),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
export type ReportLeaderboardQuery = z.infer<typeof reportLeaderboardQuerySchema>;

export interface ReportLeaderboardRowDto {
  key: string;
  label: string;
  /** landing-page: số Form Submit; recruiter/source: số ứng viên mới trong khoảng thời gian. */
  count: number;
  hires: number;
}

export interface ReportLeaderboardResponse {
  items: ReportLeaderboardRowDto[];
}

export const triggerRollupSchema = z.object({
  date: z.string().date("Ngày không hợp lệ").optional(),
});
export type TriggerRollupInput = z.infer<typeof triggerRollupSchema>;

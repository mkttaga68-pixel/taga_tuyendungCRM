import { apiRequest } from "./api-client";
import type {
  ReportLeaderboardQuery,
  ReportLeaderboardResponse,
  ReportOverviewDto,
  ReportOverviewQuery,
  TriggerRollupInput,
} from "@taga-crm/shared";

export function getReportOverview(query: ReportOverviewQuery) {
  const params = new URLSearchParams();
  params.set("dateFrom", query.dateFrom);
  params.set("dateTo", query.dateTo);
  params.set("groupBy", query.groupBy);
  if (query.landingPageId) params.set("landingPageId", query.landingPageId);
  return apiRequest<ReportOverviewDto>(`/reports/overview?${params.toString()}`);
}

export function getReportLeaderboard(query: ReportLeaderboardQuery) {
  const params = new URLSearchParams();
  params.set("type", query.type);
  params.set("dateFrom", query.dateFrom);
  params.set("dateTo", query.dateTo);
  params.set("limit", String(query.limit ?? 10));
  return apiRequest<ReportLeaderboardResponse>(`/reports/leaderboard?${params.toString()}`);
}

export function triggerReportRollup(input: TriggerRollupInput) {
  return apiRequest<{ success: true }>("/reports/rollup/run", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

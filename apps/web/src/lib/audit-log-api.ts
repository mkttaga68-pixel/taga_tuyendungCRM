import { apiRequest } from "./api-client";
import type { AuditLogListResponse, AuditLogQuery } from "@taga-crm/shared";

export function listAuditLogs(query: AuditLogQuery) {
  const params = new URLSearchParams();
  if (query.entityTable) params.set("entityTable", query.entityTable);
  if (query.entityId) params.set("entityId", query.entityId);
  if (query.action) params.set("action", query.action);
  if (query.changedBy) params.set("changedBy", query.changedBy);
  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);
  params.set("offset", String(query.offset ?? 0));
  params.set("limit", String(query.limit ?? 50));
  return apiRequest<AuditLogListResponse>(`/audit-logs?${params.toString()}`);
}

import { apiRequest } from "./api-client";
import type {
  BulkActionResult,
  CandidateDto,
  CandidateListQuery,
  CandidateListResponse,
  CandidateStageHistoryDto,
  CreateCandidateInput,
} from "@taga-crm/shared";

function buildCandidateQueryString(params: CandidateListQuery): string {
  const search = new URLSearchParams();
  search.set("offset", String(params.offset ?? 0));
  search.set("limit", String(params.limit ?? 100));
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.filters && params.filters.length > 0) search.set("filters", JSON.stringify(params.filters));
  if (params.sorts && params.sorts.length > 0) search.set("sorts", JSON.stringify(params.sorts));
  if (params.groupBy) search.set("groupBy", params.groupBy);
  return search.toString();
}

export function listCandidates(params: CandidateListQuery) {
  return apiRequest<CandidateListResponse>(`/candidates?${buildCandidateQueryString(params)}`);
}

export function countCandidates(params: CandidateListQuery) {
  return apiRequest<{ count: number }>(`/candidates/count?${buildCandidateQueryString(params)}`);
}

export function createCandidate(input: CreateCandidateInput) {
  return apiRequest<CandidateDto>("/candidates", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCandidateFields(id: string, fields: Record<string, unknown>) {
  return apiRequest<CandidateDto>(`/candidates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
}

export function deleteCandidate(id: string) {
  return apiRequest<{ success: boolean }>(`/candidates/${id}`, { method: "DELETE" });
}

export function bulkUpdateStatus(ids: string[], statusId: string) {
  return apiRequest<BulkActionResult>("/candidates/bulk-status", {
    method: "PATCH",
    body: JSON.stringify({ ids, statusId }),
  });
}

export function bulkUpdateRecruiter(ids: string[], recruiterId: string | null) {
  return apiRequest<BulkActionResult>("/candidates/bulk-recruiter", {
    method: "PATCH",
    body: JSON.stringify({ ids, recruiterId }),
  });
}

export function bulkDeleteCandidates(ids: string[]) {
  return apiRequest<BulkActionResult>("/candidates/bulk", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}

export function getCandidate(id: string) {
  return apiRequest<CandidateDto>(`/candidates/${id}`);
}

export function getCandidateStageHistory(id: string) {
  return apiRequest<CandidateStageHistoryDto[]>(`/candidates/${id}/stage-history`);
}

export function addCandidateRelation(candidateId: string, fieldKey: string, toRecordId: string) {
  return apiRequest<{ success: boolean }>(`/candidates/${candidateId}/relations/${fieldKey}`, {
    method: "POST",
    body: JSON.stringify({ toRecordId }),
  });
}

export function removeCandidateRelation(candidateId: string, fieldKey: string, toRecordId: string) {
  return apiRequest<{ success: boolean }>(
    `/candidates/${candidateId}/relations/${fieldKey}/${toRecordId}`,
    { method: "DELETE" },
  );
}

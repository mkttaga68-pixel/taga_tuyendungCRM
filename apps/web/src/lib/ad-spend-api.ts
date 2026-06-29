import { apiRequest } from "./api-client";
import type { AdSpendListQuery, AdSpendListResponse, CreateAdSpendInput, AdSpendDto } from "@taga-crm/shared";

export function listAdSpend(query: AdSpendListQuery) {
  const params = new URLSearchParams();
  if (query.landingPageId) params.set("landingPageId", query.landingPageId);
  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);
  params.set("offset", String(query.offset ?? 0));
  params.set("limit", String(query.limit ?? 50));
  return apiRequest<AdSpendListResponse>(`/ad-spend?${params.toString()}`);
}

export function createAdSpend(input: CreateAdSpendInput) {
  return apiRequest<AdSpendDto>("/ad-spend", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteAdSpend(id: string) {
  return apiRequest<{ success: boolean }>(`/ad-spend/${id}`, { method: "DELETE" });
}

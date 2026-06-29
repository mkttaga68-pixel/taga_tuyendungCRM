import { apiRequest } from "./api-client";
import type { CreateViewInput, UpdateViewInput, ViewDto } from "@taga-crm/shared";

export function listViews(tableKey: string) {
  return apiRequest<ViewDto[]>(`/tables/${tableKey}/views`);
}

export function createView(tableKey: string, input: Omit<CreateViewInput, "tableKey">) {
  return apiRequest<ViewDto>(`/tables/${tableKey}/views`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateView(id: string, input: UpdateViewInput) {
  return apiRequest<ViewDto>(`/views/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteView(id: string) {
  return apiRequest<{ success: boolean }>(`/views/${id}`, { method: "DELETE" });
}

export function setDefaultView(id: string) {
  return apiRequest<ViewDto>(`/views/${id}/set-default`, { method: "POST" });
}

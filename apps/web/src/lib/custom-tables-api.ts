import {
  type CreateCustomTableInput,
  type UpdateCustomTableInput,
  type CreateCustomRecordInput,
  type UpdateCustomRecordInput,
  type CustomTableDto,
  type CustomRecordDto,
  type CustomRecordListResponse,
} from "@taga-crm/shared";
import { apiRequest } from "./api-client";

export function listCustomTables(): Promise<CustomTableDto[]> {
  return apiRequest("/custom-tables");
}

export function createCustomTable(body: CreateCustomTableInput): Promise<CustomTableDto> {
  return apiRequest("/custom-tables", { method: "POST", body: JSON.stringify(body) });
}

export function getCustomTable(tableKey: string): Promise<CustomTableDto> {
  return apiRequest(`/custom-tables/${tableKey}`);
}

export function updateCustomTable(
  tableKey: string,
  body: UpdateCustomTableInput,
): Promise<CustomTableDto> {
  return apiRequest(`/custom-tables/${tableKey}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function deleteCustomTable(tableKey: string): Promise<void> {
  return apiRequest(`/custom-tables/${tableKey}`, { method: "DELETE" });
}

export function listCustomRecords(
  tableKey: string,
  params?: { offset?: number; limit?: number },
): Promise<CustomRecordListResponse> {
  const qs = new URLSearchParams();
  if (params?.offset !== undefined) qs.set("offset", String(params.offset));
  if (params?.limit !== undefined) qs.set("limit", String(params.limit));
  const q = qs.toString() ? `?${qs}` : "";
  return apiRequest(`/tables/${tableKey}/records${q}`);
}

export function createCustomRecord(
  tableKey: string,
  body: CreateCustomRecordInput,
): Promise<CustomRecordDto> {
  return apiRequest(`/tables/${tableKey}/records`, { method: "POST", body: JSON.stringify(body) });
}

export function updateCustomRecord(
  recordId: string,
  body: UpdateCustomRecordInput,
): Promise<CustomRecordDto> {
  return apiRequest(`/records/${recordId}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function deleteCustomRecord(recordId: string): Promise<void> {
  return apiRequest(`/records/${recordId}`, { method: "DELETE" });
}

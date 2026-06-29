import { useAuthStore } from "@/stores/auth-store";
import { apiRequest } from "./api-client";
import type { CandidateListQuery, ExportFormat, ImportCandidatesResult } from "@taga-crm/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function buildExportQueryString(
  format: ExportFormat,
  fields: string[] | undefined,
  query: CandidateListQuery,
  ids?: string[],
): string {
  const params = new URLSearchParams();
  params.set("format", format);
  if (fields && fields.length > 0) params.set("fields", fields.join(","));
  if (ids && ids.length > 0) {
    params.set("ids", ids.join(","));
    return params.toString();
  }
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.filters && query.filters.length > 0) params.set("filters", JSON.stringify(query.filters));
  if (query.sorts && query.sorts.length > 0) params.set("sorts", JSON.stringify(query.sorts));
  return params.toString();
}

/** Tải file export về máy — dùng fetch trực tiếp (không qua apiRequest) vì response là binary, không phải JSON. */
export async function downloadCandidatesExport(
  format: ExportFormat,
  fields: string[] | undefined,
  query: CandidateListQuery,
  ids?: string[],
): Promise<{ truncated: boolean }> {
  const token = useAuthStore.getState().accessToken;
  const qs = buildExportQueryString(format, fields, query, ids);
  const res = await fetch(`${API_URL}/candidates/export?${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Không xuất được file");
  }

  const truncated = res.headers.get("X-Export-Truncated") === "true";
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `ung-vien.${format}`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return { truncated };
}

export function importCandidatesFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<ImportCandidatesResult>("/candidates/import", {
    method: "POST",
    body: formData,
  });
}

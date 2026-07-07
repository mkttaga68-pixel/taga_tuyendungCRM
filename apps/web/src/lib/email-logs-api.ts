import { apiRequest } from "./api-client";
import type {
  EmailLogDto,
  EmailLogListQuery,
  EmailLogListResponse,
  SendEmailInput,
} from "@taga-crm/shared";

export function listEmailLogs(query: EmailLogListQuery = {}) {
  const params = new URLSearchParams();
  if (query.direction) params.set("direction", query.direction);
  if (query.status) params.set("status", query.status);
  if (query.candidateId) params.set("candidateId", query.candidateId);
  if (query.search) params.set("search", query.search);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return apiRequest<EmailLogListResponse>(`/email-logs${qs ? `?${qs}` : ""}`);
}

export function getEmailLog(id: string) {
  return apiRequest<EmailLogDto>(`/email-logs/${id}`);
}

export function sendEmail(input: SendEmailInput) {
  return apiRequest<EmailLogDto>("/email-logs/send", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function markEmailAsRead(id: string) {
  return apiRequest<void>(`/email-logs/${id}/read`, { method: "PATCH" });
}

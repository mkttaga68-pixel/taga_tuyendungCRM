import { apiRequest } from "./api-client";
import type {
  CreateInterviewInput,
  InterviewDto,
  InterviewListQuery,
  InterviewListResponse,
  UpdateInterviewInput,
} from "@taga-crm/shared";

export function listInterviews(query: InterviewListQuery) {
  const params = new URLSearchParams();
  if (query.result) params.set("result", query.result);
  params.set("offset", String(query.offset ?? 0));
  params.set("limit", String(query.limit ?? 50));
  return apiRequest<InterviewListResponse>(`/interviews?${params.toString()}`);
}

export function listCandidateInterviews(candidateId: string) {
  return apiRequest<InterviewDto[]>(`/candidates/${candidateId}/interviews`);
}

export function createInterview(candidateId: string, input: CreateInterviewInput) {
  return apiRequest<InterviewDto>(`/candidates/${candidateId}/interviews`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateInterview(id: string, input: UpdateInterviewInput) {
  return apiRequest<InterviewDto>(`/interviews/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteInterview(id: string) {
  return apiRequest<{ success: boolean }>(`/interviews/${id}`, { method: "DELETE" });
}

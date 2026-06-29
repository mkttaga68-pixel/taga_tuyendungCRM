import { apiRequest } from "./api-client";
import type {
  AutomationRunListQuery,
  AutomationRunListResponse,
  AutomationWorkflowDto,
  AutomationWorkflowGraphDto,
  CreateWorkflowInput,
  SaveWorkflowGraphInput,
  UpdateWorkflowInput,
} from "@taga-crm/shared";

export function listWorkflows() {
  return apiRequest<AutomationWorkflowDto[]>("/automation/workflows");
}

export function getWorkflow(id: string) {
  return apiRequest<AutomationWorkflowDto>(`/automation/workflows/${id}`);
}

export function createWorkflow(input: CreateWorkflowInput) {
  return apiRequest<AutomationWorkflowDto>("/automation/workflows", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateWorkflow(id: string, input: UpdateWorkflowInput) {
  return apiRequest<AutomationWorkflowDto>(`/automation/workflows/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteWorkflow(id: string) {
  return apiRequest<{ success: boolean }>(`/automation/workflows/${id}`, { method: "DELETE" });
}

export function getWorkflowGraph(id: string) {
  return apiRequest<AutomationWorkflowGraphDto>(`/automation/workflows/${id}/graph`);
}

export function saveWorkflowGraph(id: string, input: SaveWorkflowGraphInput) {
  return apiRequest<AutomationWorkflowGraphDto>(`/automation/workflows/${id}/graph`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listWorkflowRuns(id: string, query: AutomationRunListQuery) {
  const params = new URLSearchParams();
  params.set("offset", String(query.offset ?? 0));
  params.set("limit", String(query.limit ?? 20));
  return apiRequest<AutomationRunListResponse>(`/automation/workflows/${id}/runs?${params.toString()}`);
}

export function testRunWorkflow(id: string, candidateId: string) {
  return apiRequest<string>(`/automation/workflows/${id}/test-run`, {
    method: "POST",
    body: JSON.stringify({ candidateId }),
  });
}

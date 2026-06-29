import { apiRequest } from "./api-client";

export interface PipelineStageDto {
  id: string;
  key: string;
  label: string;
  color: string;
  sortOrder: number;
  isTerminal: boolean;
}

export function listPipelineStages() {
  return apiRequest<PipelineStageDto[]>("/pipeline-stages");
}

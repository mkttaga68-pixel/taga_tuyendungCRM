import { apiRequest } from "./api-client";
import type {
  CreateFieldDefinitionInput,
  FieldDefinitionDto,
  UpdateFieldDefinitionInput,
} from "@taga-crm/shared";

export function listFieldDefinitions(tableKey: string) {
  return apiRequest<FieldDefinitionDto[]>(`/tables/${tableKey}/fields`);
}

export function createFieldDefinition(
  tableKey: string,
  input: Omit<CreateFieldDefinitionInput, "tableKey">,
) {
  return apiRequest<FieldDefinitionDto>(`/tables/${tableKey}/fields`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateFieldDefinition(id: string, input: UpdateFieldDefinitionInput) {
  return apiRequest<FieldDefinitionDto>(`/fields/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteFieldDefinition(id: string) {
  return apiRequest<{ success: boolean }>(`/fields/${id}`, { method: "DELETE" });
}

export function reorderFieldDefinitions(tableKey: string, orderedIds: string[]) {
  return apiRequest<void>(`/tables/${tableKey}/fields/reorder`, {
    method: "POST",
    body: JSON.stringify({ orderedIds }),
  });
}

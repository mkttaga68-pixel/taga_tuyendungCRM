import { apiRequest } from "./api-client";
import type { CommentDto, CreateCommentInput } from "@taga-crm/shared";

export function listComments(entityTable: string, entityId: string) {
  const params = new URLSearchParams({ entityTable, entityId });
  return apiRequest<CommentDto[]>(`/comments?${params.toString()}`);
}

export function createComment(input: CreateCommentInput) {
  return apiRequest<CommentDto>("/comments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteComment(id: string) {
  return apiRequest<{ success: boolean }>(`/comments/${id}`, { method: "DELETE" });
}

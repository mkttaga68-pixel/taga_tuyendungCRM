import { apiRequest } from "./api-client";
import type { CreateUserInput, UpdateUserInput, UserDto } from "@taga-crm/shared";

export function listUsers() {
  return apiRequest<UserDto[]>("/users");
}

export function createUser(input: CreateUserInput) {
  return apiRequest<UserDto>("/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateUser(id: string, input: UpdateUserInput) {
  return apiRequest<UserDto>(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteUser(id: string) {
  return apiRequest<{ success: true }>(`/users/${id}`, {
    method: "DELETE",
  });
}

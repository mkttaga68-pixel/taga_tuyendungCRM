import { apiRequest } from "./api-client";
import type { Role } from "@taga-crm/shared";

export interface UserLookupDto {
  id: string;
  fullName: string;
  role: Role;
}

export function lookupUsers() {
  return apiRequest<UserLookupDto[]>("/users/lookup");
}

import { apiRequest } from "./api-client";
import type { GoogleIntegrationStatusDto } from "@taga-crm/shared";

export function getGoogleIntegrationStatus() {
  return apiRequest<GoogleIntegrationStatusDto>("/integrations/google/status");
}

export function getGoogleAuthUrl() {
  return apiRequest<{ url: string }>("/integrations/google/auth-url");
}

export function disconnectGoogleIntegration() {
  return apiRequest<{ success: true }>("/integrations/google/disconnect", { method: "POST" });
}

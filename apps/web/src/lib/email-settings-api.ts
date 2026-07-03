import { apiRequest } from "./api-client";

export interface EmailSettingsStatus {
  configured: boolean;
  maskedKey: string | null;
  fromEmail: string;
  fromName: string;
}

export interface SaveEmailSettingsInput {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export function getEmailSettingsStatus() {
  return apiRequest<EmailSettingsStatus>("/settings/email");
}

export function saveEmailSettings(input: SaveEmailSettingsInput) {
  return apiRequest<EmailSettingsStatus>("/settings/email", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function sendTestEmail() {
  return apiRequest<{ success: boolean; sentTo: string }>("/settings/email/test", {
    method: "POST",
  });
}

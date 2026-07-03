import { apiRequest } from "./api-client";

export interface UiSettings {
  candidatesTableName: string;
}

export function getUiSettings(): Promise<UiSettings> {
  return apiRequest("/settings/ui");
}

export function updateUiSettings(body: Partial<UiSettings>): Promise<UiSettings> {
  return apiRequest("/settings/ui", { method: "PATCH", body: JSON.stringify(body) });
}

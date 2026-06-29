import { apiRequest } from "./api-client";
import type {
  CreateLandingPageInput,
  FormSchemaShape,
  FormSubmissionListResponse,
  FormSubmissionQuery,
  LandingPageDto,
  LandingPageFormDto,
  LandingPageWithApiKeyDto,
  UpdateLandingPageInput,
} from "@taga-crm/shared";

export function listLandingPages() {
  return apiRequest<LandingPageDto[]>("/landing-pages");
}

export function getLandingPage(id: string) {
  return apiRequest<LandingPageDto>(`/landing-pages/${id}`);
}

export function createLandingPage(input: CreateLandingPageInput) {
  return apiRequest<LandingPageWithApiKeyDto>("/landing-pages", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateLandingPage(id: string, input: UpdateLandingPageInput) {
  return apiRequest<LandingPageDto>(`/landing-pages/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function regenerateApiKey(id: string) {
  return apiRequest<LandingPageWithApiKeyDto>(`/landing-pages/${id}/regenerate-api-key`, {
    method: "POST",
  });
}

export function listFormVersions(landingPageId: string) {
  return apiRequest<LandingPageFormDto[]>(`/landing-pages/${landingPageId}/forms`);
}

export function getActiveForm(landingPageId: string) {
  return apiRequest<LandingPageFormDto | null>(`/landing-pages/${landingPageId}/forms/active`);
}

export function createFormVersion(landingPageId: string, schema: FormSchemaShape) {
  return apiRequest<LandingPageFormDto>(`/landing-pages/${landingPageId}/forms`, {
    method: "POST",
    body: JSON.stringify({ schema }),
  });
}

export function listSubmissions(landingPageId: string, query: FormSubmissionQuery) {
  const params = new URLSearchParams();
  if (query.processingStatus) params.set("processingStatus", query.processingStatus);
  params.set("offset", String(query.offset ?? 0));
  params.set("limit", String(query.limit ?? 50));
  return apiRequest<FormSubmissionListResponse>(
    `/landing-pages/${landingPageId}/submissions?${params.toString()}`,
  );
}

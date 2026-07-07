import { apiRequest } from "./api-client";
import type {
  MktContactDto,
  MktContactListResponse,
  MktContactQuery,
  CreateMktContactInput,
  UpdateMktContactInput,
  MktContactEventDto,
  MktContactListDto,
  CreateMktContactListInput,
  UpdateMktContactListInput,
  AddContactToListInput,
  MktTagDto,
  CreateMktTagInput,
  UpdateMktTagInput,
  MktCampaignDto,
  MktCampaignEmailDto,
  MktCampaignEnrollmentDto,
  CreateMktCampaignInput,
  UpdateMktCampaignInput,
  CreateMktCampaignEmailInput,
  UpdateMktCampaignEmailInput,
  EnrollContactInput,
  MktDashboardStats,
  MktLandingPageConfigDto,
  CreateMktLandingPageConfigInput,
} from "@taga-crm/shared";

// ---- Contacts ----
export function listMktContacts(query: Partial<MktContactQuery> = {}) {
  const p = new URLSearchParams();
  if (query.search) p.set("search", query.search);
  if (query.listId) p.set("listId", query.listId);
  if (query.tagId) p.set("tagId", query.tagId);
  if (query.page) p.set("page", String(query.page));
  if (query.limit) p.set("limit", String(query.limit));
  if (query.unsubscribed !== undefined) p.set("unsubscribed", String(query.unsubscribed));
  const qs = p.toString();
  return apiRequest<MktContactListResponse>(`/mkt/contacts${qs ? `?${qs}` : ""}`);
}

export function getMktContact(id: string) {
  return apiRequest<MktContactDto>(`/mkt/contacts/${id}`);
}

export function getMktContactTimeline(id: string) {
  return apiRequest<MktContactEventDto[]>(`/mkt/contacts/${id}/timeline`);
}

export function createMktContact(input: CreateMktContactInput) {
  return apiRequest<MktContactDto>("/mkt/contacts", { method: "POST", body: JSON.stringify(input) });
}

export function updateMktContact(id: string, input: UpdateMktContactInput) {
  return apiRequest<MktContactDto>(`/mkt/contacts/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteMktContact(id: string) {
  return apiRequest<void>(`/mkt/contacts/${id}`, { method: "DELETE" });
}

// ---- Contact Lists ----
export function listMktContactLists() {
  return apiRequest<MktContactListDto[]>("/mkt/contact-lists");
}

export function getMktContactList(id: string) {
  return apiRequest<MktContactListDto>(`/mkt/contact-lists/${id}`);
}

export function createMktContactList(input: CreateMktContactListInput) {
  return apiRequest<MktContactListDto>("/mkt/contact-lists", { method: "POST", body: JSON.stringify(input) });
}

export function updateMktContactList(id: string, input: UpdateMktContactListInput) {
  return apiRequest<MktContactListDto>(`/mkt/contact-lists/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteMktContactList(id: string) {
  return apiRequest<void>(`/mkt/contact-lists/${id}`, { method: "DELETE" });
}

export function addContactToList(listId: string, input: AddContactToListInput) {
  return apiRequest<void>(`/mkt/contact-lists/${listId}/contacts`, { method: "POST", body: JSON.stringify(input) });
}

export function removeContactFromList(listId: string, contactId: string) {
  return apiRequest<void>(`/mkt/contact-lists/${listId}/contacts/${contactId}`, { method: "DELETE" });
}

// ---- Tags ----
export function listMktTags() {
  return apiRequest<MktTagDto[]>("/mkt/tags");
}

export function createMktTag(input: CreateMktTagInput) {
  return apiRequest<MktTagDto>("/mkt/tags", { method: "POST", body: JSON.stringify(input) });
}

export function updateMktTag(id: string, input: UpdateMktTagInput) {
  return apiRequest<MktTagDto>(`/mkt/tags/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteMktTag(id: string) {
  return apiRequest<void>(`/mkt/tags/${id}`, { method: "DELETE" });
}

// ---- Campaigns ----
export function listMktCampaigns() {
  return apiRequest<MktCampaignDto[]>("/mkt/campaigns");
}

export function getMktCampaign(id: string) {
  return apiRequest<MktCampaignDto>(`/mkt/campaigns/${id}`);
}

export function createMktCampaign(input: CreateMktCampaignInput) {
  return apiRequest<MktCampaignDto>("/mkt/campaigns", { method: "POST", body: JSON.stringify(input) });
}

export function updateMktCampaign(id: string, input: UpdateMktCampaignInput) {
  return apiRequest<MktCampaignDto>(`/mkt/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteMktCampaign(id: string) {
  return apiRequest<void>(`/mkt/campaigns/${id}`, { method: "DELETE" });
}

export function activateMktCampaign(id: string) {
  return apiRequest<MktCampaignDto>(`/mkt/campaigns/${id}/activate`, { method: "POST" });
}

export function pauseMktCampaign(id: string) {
  return apiRequest<MktCampaignDto>(`/mkt/campaigns/${id}/pause`, { method: "POST" });
}

export function listMktCampaignEmails(campaignId: string) {
  return apiRequest<MktCampaignEmailDto[]>(`/mkt/campaigns/${campaignId}/emails`);
}

export function addMktCampaignEmail(campaignId: string, input: CreateMktCampaignEmailInput) {
  return apiRequest<MktCampaignEmailDto>(`/mkt/campaigns/${campaignId}/emails`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateMktCampaignEmail(campaignId: string, emailId: string, input: UpdateMktCampaignEmailInput) {
  return apiRequest<MktCampaignEmailDto>(`/mkt/campaigns/${campaignId}/emails/${emailId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteMktCampaignEmail(campaignId: string, emailId: string) {
  return apiRequest<void>(`/mkt/campaigns/${campaignId}/emails/${emailId}`, { method: "DELETE" });
}

export function reorderMktCampaignEmail(campaignId: string, emailId: string, newPosition: number) {
  return apiRequest<MktCampaignEmailDto[]>(`/mkt/campaigns/${campaignId}/emails/${emailId}/reorder`, {
    method: "POST",
    body: JSON.stringify({ emailId, newPosition }),
  });
}

export function listMktCampaignEnrollments(campaignId: string) {
  return apiRequest<MktCampaignEnrollmentDto[]>(`/mkt/campaigns/${campaignId}/enrollments`);
}

export function enrollContactsToCampaign(campaignId: string, input: EnrollContactInput) {
  return apiRequest<{ enrolled: number }>(`/mkt/campaigns/${campaignId}/enroll`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ---- Dashboard ----
export function getMktDashboard() {
  return apiRequest<MktDashboardStats>("/mkt/dashboard");
}

// ---- Landing Page Config ----
export function getMktLandingPageConfig(landingPageId: string) {
  return apiRequest<MktLandingPageConfigDto | null>(`/mkt/landing-page-configs/${landingPageId}`);
}

export function upsertMktLandingPageConfig(landingPageId: string, input: CreateMktLandingPageConfigInput) {
  return apiRequest<MktLandingPageConfigDto>(`/mkt/landing-page-configs/${landingPageId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

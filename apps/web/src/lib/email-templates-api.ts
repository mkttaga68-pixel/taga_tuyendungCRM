import { apiRequest } from "./api-client";
import type {
  CreateEmailTemplateInput,
  EmailBlock,
  EmailTemplateDto,
  UpdateEmailTemplateInput,
} from "@taga-crm/shared";

export function listEmailTemplates() {
  return apiRequest<EmailTemplateDto[]>("/email-templates");
}

export function getEmailTemplate(id: string) {
  return apiRequest<EmailTemplateDto>(`/email-templates/${id}`);
}

export function createEmailTemplate(input: CreateEmailTemplateInput) {
  return apiRequest<EmailTemplateDto>("/email-templates", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateEmailTemplate(id: string, input: UpdateEmailTemplateInput) {
  return apiRequest<EmailTemplateDto>(`/email-templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteEmailTemplate(id: string) {
  return apiRequest<{ success: true }>(`/email-templates/${id}`, {
    method: "DELETE",
  });
}

export function renderEmailTemplatePreview(id: string) {
  return apiRequest<{ html: string }>(`/email-templates/${id}/preview`);
}

export function renderEmailBlocksPreview(blocks: EmailBlock[]) {
  return apiRequest<{ html: string }>("/email-templates/preview", {
    method: "POST",
    body: JSON.stringify({ blocks }),
  });
}

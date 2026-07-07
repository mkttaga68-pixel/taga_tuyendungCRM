import { z } from "zod";

export const EMAIL_DIRECTIONS = ["INBOUND", "OUTBOUND"] as const;
export type EmailDirection = (typeof EMAIL_DIRECTIONS)[number];

export const EMAIL_STATUSES = ["QUEUED", "SENT", "FAILED", "BOUNCED"] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export const EMAIL_STATUS_LABELS: Record<EmailStatus, string> = {
  QUEUED: "Đang chờ",
  SENT: "Đã gửi",
  FAILED: "Lỗi",
  BOUNCED: "Bị trả lại",
};

export interface EmailLogDto {
  id: string;
  templateId: string | null;
  toEmail: string;
  fromEmail: string | null;
  candidateId: string | null;
  candidateName: string | null;
  subject: string;
  bodyHtml: string;
  status: EmailStatus;
  direction: EmailDirection;
  providerMessageId: string | null;
  sentAt: string | null;
  errorMessage: string | null;
  sentBy: string | null;
  sentByName: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface EmailLogListQuery {
  direction?: EmailDirection;
  status?: EmailStatus;
  candidateId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface EmailLogListResponse {
  data: EmailLogDto[];
  total: number;
  page: number;
  limit: number;
  unreadCount: number;
}

export const sendEmailSchema = z.object({
  to: z.string().email("Email không hợp lệ"),
  subject: z.string().min(1, "Tiêu đề không được trống").max(300),
  bodyTemplate: z.string().min(1, "Nội dung không được trống").max(20000),
  candidateId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
});
export type SendEmailInput = z.infer<typeof sendEmailSchema>;

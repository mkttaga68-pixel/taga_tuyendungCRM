import { z } from "zod";
import { SUBMISSION_PROCESSING_STATUSES } from "../enums/landing-page.enum";

/**
 * Hợp đồng dữ liệu cho POST /public/landing-pages/:slug/submit — dùng chung
 * cho cả request JSON (fetch, có JS) và request form-urlencoded (fallback
 * <form action> khi nền tảng nhúng chặn JS, ví dụ Webcake). "values" chứa
 * đúng các field do Form Builder định nghĩa cho landing page đó (key tự do,
 * vd hoTen/soDienThoai/email/ngaySinh/diaChi/khuVuc/gate1/gate2/gate3...).
 */
export const publicSubmitPayloadSchema = z.object({
  values: z.record(z.string(), z.unknown()),
  cvFileName: z.string().max(255).optional().or(z.literal("")),
  cvBase64: z.string().optional().or(z.literal("")),
  fbc: z.string().max(500).optional().or(z.literal("")),
  fbp: z.string().max(500).optional().or(z.literal("")),
  ttclid: z.string().max(500).optional().or(z.literal("")),
  userAgent: z.string().max(1000).optional().or(z.literal("")),
  pageUrl: z.string().max(2000).optional().or(z.literal("")),
  /** Hidden honeypot field — phải luôn trống ở người dùng thật. */
  honeypot: z.string().max(500).optional().or(z.literal("")),
});
export type PublicSubmitPayload = z.infer<typeof publicSubmitPayloadSchema>;

export const formSubmissionQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  processingStatus: z.enum(SUBMISSION_PROCESSING_STATUSES).optional(),
});
export type FormSubmissionQuery = z.infer<typeof formSubmissionQuerySchema>;

export interface FormSubmissionDto {
  id: string;
  landingPageId: string;
  formId: string | null;
  rawPayload: unknown;
  ip: string | null;
  userAgent: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  fbc: string | null;
  fbp: string | null;
  ttclid: string | null;
  submittedAt: string;
  candidateId: string | null;
  candidateName: string | null;
  processingStatus: (typeof SUBMISSION_PROCESSING_STATUSES)[number];
  errorMessage: string | null;
}

export interface FormSubmissionListResponse {
  items: FormSubmissionDto[];
  hasMore: boolean;
}

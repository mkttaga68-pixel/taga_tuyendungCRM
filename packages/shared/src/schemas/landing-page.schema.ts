import { z } from "zod";
import { LANDING_PAGE_STATUSES } from "../enums/landing-page.enum";

export const landingPageTrackingConfigSchema = z.object({
  ga4MeasurementId: z.string().max(50).optional().or(z.literal("")),
  /** GA4 Property ID (số, VD "123456789") — khác Measurement ID, dùng để gọi GA4 Data API lấy visitors/sessions/... ở Sprint 7. */
  ga4PropertyId: z.string().max(30).optional().or(z.literal("")),
  gtmContainerId: z.string().max(50).optional().or(z.literal("")),
  metaPixelId: z.string().max(50).optional().or(z.literal("")),
  tiktokPixelId: z.string().max(50).optional().or(z.literal("")),
});
export type LandingPageTrackingConfig = z.infer<typeof landingPageTrackingConfigSchema>;

export const createLandingPageSchema = z.object({
  name: z.string().min(1, "Tên không được để trống").max(200),
  slug: z
    .string()
    .min(1, "Slug không được để trống")
    .max(100)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang"),
  url: z.string().url("URL không hợp lệ"),
  domain: z.string().max(200).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  status: z.enum(LANDING_PAGE_STATUSES).optional(),
  trackingConfig: landingPageTrackingConfigSchema.optional(),
});
export type CreateLandingPageInput = z.infer<typeof createLandingPageSchema>;

export const updateLandingPageSchema = createLandingPageSchema.omit({ slug: true }).partial();
export type UpdateLandingPageInput = z.infer<typeof updateLandingPageSchema>;

export interface LandingPageDto {
  id: string;
  name: string;
  slug: string;
  url: string;
  domain: string | null;
  status: (typeof LANDING_PAGE_STATUSES)[number];
  description: string | null;
  trackingConfig: LandingPageTrackingConfig;
  creator: { id: string; fullName: string } | null;
  submissionCount: number;
  candidateCount: number;
  defaultListId: string | null;
  defaultListName: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Chỉ trả về đúng 1 lần lúc tạo/regenerate — sau đó chỉ còn apiKeyHash trong DB. */
export interface LandingPageWithApiKeyDto extends LandingPageDto {
  apiKey: string;
}

export interface LandingPageListResponse {
  items: LandingPageDto[];
}

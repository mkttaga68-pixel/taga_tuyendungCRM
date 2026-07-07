import { z } from "zod";

export type MktCampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
export type MktDelayUnit = "MINUTES" | "HOURS" | "DAYS" | "WEEKS";
export type MktEnrollmentStatus = "ACTIVE" | "COMPLETED" | "UNSUBSCRIBED" | "FAILED";
export type MktEmailSendStatus = "SCHEDULED" | "SENT" | "FAILED" | "SKIPPED";
export type MktEmailEventType = "OPEN" | "CLICK" | "BOUNCE" | "SPAM" | "UNSUBSCRIBE";

export interface MktSendWindow {
  from: string;
  to: string;
  days: number[];
  tz: string;
}

export const DEFAULT_SEND_WINDOW: MktSendWindow = {
  from: "08:00",
  to: "20:00",
  days: [1, 2, 3, 4, 5],
  tz: "Asia/Ho_Chi_Minh",
};

export interface MktCampaignEmailDto {
  id: string;
  campaignId: string;
  position: number;
  subject: string;
  bodyHtml: string;
  templateId: string | null;
  delayValue: number;
  delayUnit: MktDelayUnit;
  sendWindow: MktSendWindow;
  condition: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  stats: {
    sent: number;
    delivered: number;
    opened: number;
    openRate: number;
    clicked: number;
    ctr: number;
    bounced: number;
    spam: number;
    unsubscribed: number;
  };
}

export interface MktCampaignDto {
  id: string;
  name: string;
  description: string | null;
  status: MktCampaignStatus;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  emailCount: number;
  enrollmentCount: number;
}

export const sendWindowSchema = z.object({
  from: z.string().regex(/^\d{2}:\d{2}$/),
  to: z.string().regex(/^\d{2}:\d{2}$/),
  days: z.array(z.number().min(0).max(6)),
  tz: z.string(),
});

export const createMktCampaignSchema = z.object({
  name: z.string().min(1, "Tên không được để trống"),
  description: z.string().optional(),
  fromName: z.string().min(1),
  fromEmail: z.string().email(),
  replyTo: z.string().email().optional(),
});
export type CreateMktCampaignInput = z.infer<typeof createMktCampaignSchema>;

export const updateMktCampaignSchema = createMktCampaignSchema.partial();
export type UpdateMktCampaignInput = z.infer<typeof updateMktCampaignSchema>;

export const createMktCampaignEmailSchema = z.object({
  subject: z.string().min(1),
  bodyHtml: z.string().min(1),
  templateId: z.string().uuid().optional(),
  delayValue: z.number().min(0).default(0),
  delayUnit: z.enum(["MINUTES", "HOURS", "DAYS", "WEEKS"]).default("DAYS"),
  sendWindow: sendWindowSchema.optional(),
  condition: z.record(z.unknown()).optional().default({}),
});
export type CreateMktCampaignEmailInput = z.infer<typeof createMktCampaignEmailSchema>;

export const updateMktCampaignEmailSchema = createMktCampaignEmailSchema.partial();
export type UpdateMktCampaignEmailInput = z.infer<typeof updateMktCampaignEmailSchema>;

export const reorderMktCampaignEmailSchema = z.object({
  emailId: z.string().uuid(),
  newPosition: z.number().min(1),
});
export type ReorderMktCampaignEmailInput = z.infer<typeof reorderMktCampaignEmailSchema>;

export const enrollContactSchema = z.object({
  contactIds: z.array(z.string().uuid()).min(1),
});
export type EnrollContactInput = z.infer<typeof enrollContactSchema>;

export interface MktCampaignEnrollmentDto {
  id: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  campaignId: string;
  currentStep: number;
  status: MktEnrollmentStatus;
  enrolledAt: string;
  completedAt: string | null;
}

export interface MktDashboardStats {
  totalContacts: number;
  totalLists: number;
  totalCampaigns: number;
  totalEmailsSent: number;
  overallOpenRate: number;
  overallCtr: number;
  recentCampaigns: {
    id: string;
    name: string;
    status: MktCampaignStatus;
    sent: number;
    openRate: number;
    ctr: number;
  }[];
}

export const createMktLandingPageConfigSchema = z.object({
  defaultListId: z.string().uuid().nullable().optional(),
  defaultCampaignId: z.string().uuid().nullable().optional(),
  defaultTagIds: z.array(z.string().uuid()).optional().default([]),
  sourceLabel: z.string().optional(),
});
export type CreateMktLandingPageConfigInput = z.infer<typeof createMktLandingPageConfigSchema>;

export interface MktLandingPageConfigDto {
  landingPageId: string;
  defaultListId: string | null;
  defaultCampaignId: string | null;
  defaultTagIds: string[];
  sourceLabel: string | null;
  updatedAt: string;
}

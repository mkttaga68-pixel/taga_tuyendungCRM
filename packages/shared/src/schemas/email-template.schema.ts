import { z } from "zod";

export const EMAIL_BLOCK_TYPES = [
  "TEXT",
  "IMAGE",
  "BUTTON",
  "DIVIDER",
  "SPACER",
  "SOCIAL",
  "SECTION",
] as const;
export type EmailBlockType = (typeof EMAIL_BLOCK_TYPES)[number];

export const EMAIL_BLOCK_TYPE_LABELS: Record<EmailBlockType, string> = {
  TEXT: "Văn bản",
  IMAGE: "Hình ảnh",
  BUTTON: "Nút bấm",
  DIVIDER: "Đường kẻ",
  SPACER: "Khoảng trống",
  SOCIAL: "Mạng xã hội",
  SECTION: "Khối nền (Section)",
};

const ALIGN_VALUES = ["left", "center", "right"] as const;

const textBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("TEXT"),
  content: z.string().max(5000),
  align: z.enum(ALIGN_VALUES).default("left"),
  fontSize: z.number().min(10).max(48).default(14),
});

const imageBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("IMAGE"),
  url: z.string().min(1),
  alt: z.string().max(200).optional(),
  link: z.string().max(1000).optional(),
  width: z.number().min(20).max(600).default(300),
});

const buttonBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("BUTTON"),
  label: z.string().min(1).max(60),
  url: z.string().min(1),
  color: z.string().min(1).default("#111827"),
  align: z.enum(ALIGN_VALUES).default("center"),
});

const dividerBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("DIVIDER"),
  color: z.string().min(1).default("#e5e7eb"),
});

const spacerBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("SPACER"),
  height: z.number().min(4).max(200).default(20),
});

const socialLinkSchema = z.object({
  platform: z.string().min(1).max(30),
  url: z.string().min(1),
});

const socialBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("SOCIAL"),
  links: z.array(socialLinkSchema).max(8).default([]),
});

/** Block lá — không chứa block con, dùng được cả ở top-level và trong 1 SECTION. */
export const emailLeafBlockSchema = z.discriminatedUnion("type", [
  textBlockSchema,
  imageBlockSchema,
  buttonBlockSchema,
  dividerBlockSchema,
  spacerBlockSchema,
  socialBlockSchema,
]);
export type EmailLeafBlock = z.infer<typeof emailLeafBlockSchema>;

/**
 * SECTION chỉ lồng 1 cấp (chứa block lá, không chứa SECTION khác) — đủ để tạo
 * dải nền màu/padding kiểu header-band, không cần multi-column thật sự.
 */
export const emailSectionBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal("SECTION"),
  backgroundColor: z.string().min(1).default("#ffffff"),
  padding: z.number().min(0).max(60).default(16),
  blocks: z.array(emailLeafBlockSchema).max(20).default([]),
});
export type EmailSectionBlock = z.infer<typeof emailSectionBlockSchema>;

export const emailBlockSchema = z.union([emailLeafBlockSchema, emailSectionBlockSchema]);
export type EmailBlock = z.infer<typeof emailBlockSchema>;

export const emailBlocksSchema = z.array(emailBlockSchema).max(40);

export const createEmailTemplateSchema = z.object({
  name: z.string().min(1, "Tên mẫu tối thiểu 1 ký tự").max(150),
  subject: z.string().max(300).default(""),
  blocks: emailBlocksSchema,
});
export type CreateEmailTemplateInput = z.infer<typeof createEmailTemplateSchema>;

export const updateEmailTemplateSchema = createEmailTemplateSchema.partial();
export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateSchema>;

export interface EmailTemplateDto {
  id: string;
  name: string;
  subject: string;
  blocks: EmailBlock[];
  thumbnailUrl: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplateRenderResult {
  html: string;
}

/** Biến `{{candidate.x}}` khả dụng khi soạn mẫu — đồng bộ với candidate-context.ts ở worker. */
export const EMAIL_TEMPLATE_VARIABLES: { key: string; label: string }[] = [
  { key: "candidate.fullName", label: "Họ tên ứng viên" },
  { key: "candidate.email", label: "Email ứng viên" },
  { key: "candidate.phone", label: "SĐT ứng viên" },
  { key: "candidate.statusLabel", label: "Trạng thái hiện tại" },
  { key: "candidate.nextActionNote", label: "Hành động tiếp theo" },
  { key: "candidate.recruiterName", label: "Recruiter phụ trách" },
  { key: "candidate.landingPageName", label: "Landing Page nguồn" },
];

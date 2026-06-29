import { z } from "zod";
import { FORM_FIELD_TYPES } from "../enums/landing-page.enum";

/**
 * Field trên form public có thể "map" vào đúng 1 cột thật của Candidate —
 * Ingestion Engine dùng để biết field nào là tên/SĐT/email... bất kể key do
 * người dựng form đặt tên gì (vd "hoTen" hay "fullName" đều map "fullName").
 * Field không map (mapsTo=undefined) sẽ rơi vào customFields theo đúng key.
 */
export const CANDIDATE_FIELD_MAPPINGS = [
  "fullName",
  "phone",
  "email",
  "dob",
  "address",
  "areaBranch",
  "facebookLink",
  "note",
  "cv",
] as const;
export type CandidateFieldMapping = (typeof CANDIDATE_FIELD_MAPPINGS)[number];

export const formFieldSchema = z.object({
  key: z
    .string()
    .min(1, "Key không được để trống")
    .max(64)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Key phải bắt đầu bằng chữ, chỉ gồm chữ/số/_"),
  label: z.string().min(1, "Nhãn không được để trống").max(200),
  type: z.enum(FORM_FIELD_TYPES),
  required: z.boolean().optional(),
  placeholder: z.string().max(200).optional(),
  helpText: z.string().max(500).optional(),
  /** Cho SELECT: danh sách lựa chọn hiển thị trên form public. */
  options: z.array(z.string().min(1).max(200)).optional(),
  mapsTo: z.enum(CANDIDATE_FIELD_MAPPINGS).optional(),
});
export type FormField = z.infer<typeof formFieldSchema>;

/**
 * Schema JSON lưu trong landing_page_forms.schema — mô tả toàn bộ field của 1
 * version form. honeypotKey = key field bẫy bot (luôn để trống ở người dùng
 * thật) — không hiển thị label, ẩn bằng CSS phía landing page.
 */
export const formSchemaSchema = z.object({
  fields: z.array(formFieldSchema).min(1, "Form cần ít nhất 1 field"),
  honeypotKey: z.string().min(1).max(64).optional(),
});
export type FormSchemaShape = z.infer<typeof formSchemaSchema>;

export const createLandingPageFormSchema = z.object({
  schema: formSchemaSchema,
});
export type CreateLandingPageFormInput = z.infer<typeof createLandingPageFormSchema>;

export interface LandingPageFormDto {
  id: string;
  landingPageId: string;
  version: number;
  schema: FormSchemaShape;
  isActive: boolean;
  createdAt: string;
}

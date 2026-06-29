import { z } from "zod";
import { FIELD_TYPES } from "../enums/field-type.enum";

/** Slug kỹ thuật của field, dùng làm key trong custom_fields JSONB hoặc tên cột hệ thống. */
const fieldKeySchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/, "fieldKey chỉ gồm chữ thường, số, gạch dưới, bắt đầu bằng chữ");

export const createFieldDefinitionSchema = z.object({
  tableKey: z.string().min(1).max(64),
  fieldKey: fieldKeySchema,
  label: z.string().min(1).max(200),
  fieldType: z.enum(FIELD_TYPES),
  options: z.record(z.string(), z.unknown()).optional(),
  isRequired: z.boolean().optional(),
});
export type CreateFieldDefinitionInput = z.infer<typeof createFieldDefinitionSchema>;

export const updateFieldDefinitionSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  sortOrder: z.number().int().optional(),
  width: z.number().int().min(60).max(800).optional(),
  isFrozen: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  isRequired: z.boolean().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});
export type UpdateFieldDefinitionInput = z.infer<typeof updateFieldDefinitionSchema>;

export const reorderFieldDefinitionsSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});
export type ReorderFieldDefinitionsInput = z.infer<typeof reorderFieldDefinitionsSchema>;

export interface FieldDefinitionDto {
  id: string;
  tableKey: string;
  fieldKey: string;
  label: string;
  fieldType: (typeof FIELD_TYPES)[number];
  options: Record<string, unknown> | null;
  sortOrder: number;
  width: number;
  isFrozen: boolean;
  isHidden: boolean;
  isRequired: boolean;
  isSystem: boolean;
}

/**
 * Type nào hiện cho phép tạo MỚI như custom field. IMAGE/ATTACHMENT vẫn chưa
 * hỗ trợ (cần hạ tầng upload S3 riêng cho field tự thêm, khác CV upload có
 * sẵn). CREATED_TIME/UPDATED_TIME/AUTO_NUMBER hệ thống tự sinh, không tạo tay
 * được. RELATION/LOOKUP/ROLLUP/FORMULA (Sprint 8 — generic compute engine,
 * xem options schema bên dưới) — giá trị tính ở read-time, không lưu vào
 * customFields JSONB (xem COMPUTED_FIELD_TYPES).
 */
export const CREATABLE_CUSTOM_FIELD_TYPES = [
  "TEXT",
  "LONG_TEXT",
  "NUMBER",
  "PHONE",
  "EMAIL",
  "DATE",
  "DATETIME",
  "CHECKBOX",
  "SELECT",
  "MULTI_SELECT",
  "LINK",
  "RATING",
  "CURRENCY",
  "PERCENT",
  "USER",
  "RELATION",
  "LOOKUP",
  "ROLLUP",
  "FORMULA",
] as const;

export const ROLLUP_AGGREGATIONS = ["SUM", "AVG", "COUNT", "MIN", "MAX"] as const;
export type RollupAggregation = (typeof ROLLUP_AGGREGATIONS)[number];

/** config field-type RELATION — liên kết record này tới record khác (cùng bảng hoặc bảng khác), lưu vào record_links. */
export const relationFieldOptionsSchema = z.object({
  toTableKey: z.string().min(1).max(64),
});
export type RelationFieldOptions = z.infer<typeof relationFieldOptionsSchema>;

/** config field-type LOOKUP — đọc giá trị targetFieldKey từ (các) record được liên kết qua relationFieldKey. */
export const lookupFieldOptionsSchema = z.object({
  relationFieldKey: z.string().min(1).max(64),
  targetFieldKey: z.string().min(1).max(64),
});
export type LookupFieldOptions = z.infer<typeof lookupFieldOptionsSchema>;

/** config field-type ROLLUP — như Lookup nhưng tổng hợp số qua aggregation. */
export const rollupFieldOptionsSchema = z.object({
  relationFieldKey: z.string().min(1).max(64),
  targetFieldKey: z.string().min(1).max(64),
  aggregation: z.enum(ROLLUP_AGGREGATIONS),
});
export type RollupFieldOptions = z.infer<typeof rollupFieldOptionsSchema>;

/** config field-type FORMULA — biểu thức dùng {{fieldKey}} tham chiếu field khác cùng record. */
export const formulaFieldOptionsSchema = z.object({
  expression: z.string().min(1).max(2000),
});
export type FormulaFieldOptions = z.infer<typeof formulaFieldOptionsSchema>;

import { z } from "zod";
import { FIELD_TYPES, type FieldType } from "../enums/field-type.enum";

/**
 * Toàn bộ operator filter hỗ trợ trong hệ thống. Không phải field type nào
 * cũng dùng hết — FIELD_TYPE_OPERATORS dưới quy định operator hợp lệ theo
 * từng kiểu dữ liệu, dùng để cả validate ở backend và build menu ở frontend.
 */
export const FILTER_OPERATORS = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "is_empty",
  "is_not_empty",
  "gt",
  "gte",
  "lt",
  "lte",
  "before",
  "after",
  "on_or_before",
  "on_or_after",
  "is_any_of",
  "is_none_of",
  "has_any_of",
  "has_all_of",
  "has_none_of",
] as const;
export type FilterOperator = (typeof FILTER_OPERATORS)[number];

export const FILTER_OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: "bằng",
  not_equals: "khác",
  contains: "chứa",
  not_contains: "không chứa",
  is_empty: "trống",
  is_not_empty: "không trống",
  gt: "lớn hơn",
  gte: "lớn hơn hoặc bằng",
  lt: "nhỏ hơn",
  lte: "nhỏ hơn hoặc bằng",
  before: "trước",
  after: "sau",
  on_or_before: "trước hoặc đúng ngày",
  on_or_after: "sau hoặc đúng ngày",
  is_any_of: "là một trong",
  is_none_of: "không phải các giá trị",
  has_any_of: "chứa ít nhất 1 trong",
  has_all_of: "chứa tất cả",
  has_none_of: "không chứa bất kỳ",
};

/** Operator nào không cần value (vd is_empty) — dùng để frontend ẩn input value. */
export const OPERATORS_WITHOUT_VALUE: ReadonlySet<FilterOperator> = new Set([
  "is_empty",
  "is_not_empty",
]);

export const FIELD_TYPE_OPERATORS: Record<FieldType, FilterOperator[]> = {
  TEXT: ["equals", "not_equals", "contains", "not_contains", "is_empty", "is_not_empty"],
  LONG_TEXT: ["contains", "not_contains", "is_empty", "is_not_empty"],
  PHONE: ["equals", "not_equals", "contains", "not_contains", "is_empty", "is_not_empty"],
  EMAIL: ["equals", "not_equals", "contains", "not_contains", "is_empty", "is_not_empty"],
  LINK: ["equals", "not_equals", "contains", "not_contains", "is_empty", "is_not_empty"],
  NUMBER: ["equals", "not_equals", "gt", "gte", "lt", "lte", "is_empty", "is_not_empty"],
  RATING: ["equals", "not_equals", "gt", "gte", "lt", "lte", "is_empty", "is_not_empty"],
  CURRENCY: ["equals", "not_equals", "gt", "gte", "lt", "lte", "is_empty", "is_not_empty"],
  PERCENT: ["equals", "not_equals", "gt", "gte", "lt", "lte", "is_empty", "is_not_empty"],
  DATE: ["equals", "before", "after", "on_or_before", "on_or_after", "is_empty", "is_not_empty"],
  DATETIME: [
    "equals",
    "before",
    "after",
    "on_or_before",
    "on_or_after",
    "is_empty",
    "is_not_empty",
  ],
  CREATED_TIME: ["before", "after", "on_or_before", "on_or_after"],
  UPDATED_TIME: ["before", "after", "on_or_before", "on_or_after"],
  CHECKBOX: ["equals"],
  SELECT: ["equals", "not_equals", "is_any_of", "is_none_of", "is_empty", "is_not_empty"],
  MULTI_SELECT: ["has_any_of", "has_all_of", "has_none_of", "is_empty", "is_not_empty"],
  USER: ["equals", "not_equals", "is_any_of", "is_none_of", "is_empty", "is_not_empty"],
  IMAGE: ["is_empty", "is_not_empty"],
  ATTACHMENT: ["is_empty", "is_not_empty"],
  AUTO_NUMBER: ["equals", "not_equals", "gt", "gte", "lt", "lte"],
  // FK đơn (vd landingPageId) lọc được theo id ngay — không cần engine record_links
  // tổng quát (Sprint 8) vì chỉ là 1 cột FK thật, không phải multi-relation.
  RELATION: ["equals", "not_equals", "is_empty", "is_not_empty"],
  FORMULA: [],
  LOOKUP: [],
  ROLLUP: [],
  MKT_LIST: ["is_empty", "is_not_empty"],
};

/** Field type nào cho phép Sort/Filter qua API hiện tại (chưa có engine cho Formula/Lookup/Rollup/Relation — Sprint 8). */
export const FILTERABLE_FIELD_TYPES: ReadonlySet<FieldType> = new Set(
  FIELD_TYPES.filter((type) => FIELD_TYPE_OPERATORS[type].length > 0),
);
export const SORTABLE_FIELD_TYPES: ReadonlySet<FieldType> = new Set(
  FIELD_TYPES.filter((type) => !["FORMULA", "LOOKUP", "RELATION", "ROLLUP"].includes(type)),
);

export const filterConditionSchema = z.object({
  fieldKey: z.string().min(1).max(64),
  operator: z.enum(FILTER_OPERATORS),
  value: z.unknown().optional(),
});
export type FilterCondition = z.infer<typeof filterConditionSchema>;

export const sortConditionSchema = z.object({
  fieldKey: z.string().min(1).max(64),
  direction: z.enum(["asc", "desc"]),
});
export type SortCondition = z.infer<typeof sortConditionSchema>;

export const colorRuleSchema = z.object({
  id: z.string().min(1),
  filters: z.array(filterConditionSchema).min(1),
  color: z.string().min(1).max(32),
});
export type ColorRule = z.infer<typeof colorRuleSchema>;

export const ROW_HEIGHTS = ["SHORT", "MEDIUM", "TALL", "EXTRA_TALL"] as const;
export type RowHeight = (typeof ROW_HEIGHTS)[number];

export const VIEW_TYPES = ["GRID", "KANBAN", "CALENDAR"] as const;
export type ViewTypeValue = (typeof VIEW_TYPES)[number];

/** Query param GET /candidates — filters/sorts được FE encode thành JSON string trên URL. */
export const candidateQueryParamsSchema = z.object({
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  search: z.string().max(200).optional(),
  filters: z
    .string()
    .optional()
    .transform((raw, ctx) => {
      if (!raw) return [] as FilterCondition[];
      try {
        return z.array(filterConditionSchema).parse(JSON.parse(raw));
      } catch {
        ctx.addIssue({ code: "custom", message: "filters không hợp lệ" });
        return z.NEVER;
      }
    }),
  sorts: z
    .string()
    .optional()
    .transform((raw, ctx) => {
      if (!raw) return [] as SortCondition[];
      try {
        return z.array(sortConditionSchema).parse(JSON.parse(raw));
      } catch {
        ctx.addIssue({ code: "custom", message: "sorts không hợp lệ" });
        return z.NEVER;
      }
    }),
  groupBy: z.string().min(1).max(64).optional(),
});
export type CandidateQueryParams = z.infer<typeof candidateQueryParamsSchema>;

export const createViewSchema = z.object({
  tableKey: z.string().min(1).max(64),
  name: z.string().min(1).max(100),
  type: z.enum(VIEW_TYPES).optional(),
  isShared: z.boolean().optional(),
  filters: z.array(filterConditionSchema).optional(),
  sorts: z.array(sortConditionSchema).optional(),
  groupBy: z.string().min(1).max(64).optional().nullable(),
  hiddenFields: z.array(z.string()).optional(),
  frozenFieldCount: z.number().int().min(0).max(10).optional(),
  rowHeight: z.enum(ROW_HEIGHTS).optional(),
  colorRules: z.array(colorRuleSchema).optional(),
});
export type CreateViewInput = z.infer<typeof createViewSchema>;

export const updateViewSchema = createViewSchema.omit({ tableKey: true }).partial();
export type UpdateViewInput = z.infer<typeof updateViewSchema>;

export interface ViewDto {
  id: string;
  tableKey: string;
  name: string;
  type: ViewTypeValue;
  isDefault: boolean;
  ownerId: string | null;
  filters: FilterCondition[];
  sorts: SortCondition[];
  groupBy: string | null;
  hiddenFields: string[];
  frozenFieldCount: number;
  rowHeight: RowHeight;
  colorRules: ColorRule[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Toàn bộ kiểu dữ liệu mà Dynamic Field Engine hỗ trợ, áp dụng cho mọi
 * "table_key" trong hệ thống (candidates, landing_pages, interviews...).
 * Field cố định (đã biết trước trong domain model) là cột thật trong Postgres;
 * field người dùng tự thêm qua "+" trên Grid được lưu vào custom_fields JSONB
 * và mô tả bởi field_definitions theo đúng các kiểu dưới đây.
 */
export const FIELD_TYPES = [
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
  "IMAGE",
  "ATTACHMENT",
  "LINK",
  "FORMULA",
  "LOOKUP",
  "RELATION",
  "ROLLUP",
  "RATING",
  "CURRENCY",
  "PERCENT",
  "CREATED_TIME",
  "UPDATED_TIME",
  "AUTO_NUMBER",
  "USER",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT: "Text",
  LONG_TEXT: "Long Text",
  NUMBER: "Number",
  PHONE: "Phone",
  EMAIL: "Email",
  DATE: "Date",
  DATETIME: "Datetime",
  CHECKBOX: "Checkbox",
  SELECT: "Dropdown",
  MULTI_SELECT: "Multi Select",
  IMAGE: "Image",
  ATTACHMENT: "Attachment",
  LINK: "Link",
  FORMULA: "Formula",
  LOOKUP: "Lookup",
  RELATION: "Relation",
  ROLLUP: "Rollup",
  RATING: "Rating",
  CURRENCY: "Currency",
  PERCENT: "Percent",
  CREATED_TIME: "Created Time",
  UPDATED_TIME: "Updated Time",
  AUTO_NUMBER: "Auto Number",
  USER: "User",
};

/** Field type được tính tại thời điểm đọc, không lưu giá trị vật lý trong custom_fields. */
export const COMPUTED_FIELD_TYPES: ReadonlySet<FieldType> = new Set([
  "FORMULA",
  "LOOKUP",
  "ROLLUP",
  "CREATED_TIME",
  "UPDATED_TIME",
  "AUTO_NUMBER",
]);

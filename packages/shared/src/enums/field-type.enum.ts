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
  "MKT_LIST",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT: "Văn bản",
  LONG_TEXT: "Văn bản dài",
  NUMBER: "Số",
  PHONE: "Số điện thoại",
  EMAIL: "Email",
  DATE: "Ngày",
  DATETIME: "Ngày & Giờ",
  CHECKBOX: "Ô kiểm",
  SELECT: "Một lựa chọn",
  MULTI_SELECT: "Nhiều lựa chọn",
  IMAGE: "Hình ảnh",
  ATTACHMENT: "Tệp đính kèm",
  LINK: "Liên kết",
  FORMULA: "Công thức",
  LOOKUP: "Tra cứu",
  RELATION: "Liên kết bảng",
  ROLLUP: "Tổng hợp",
  RATING: "Đánh giá",
  CURRENCY: "Tiền tệ",
  PERCENT: "Phần trăm",
  CREATED_TIME: "Thời gian tạo",
  UPDATED_TIME: "Thời gian cập nhật",
  AUTO_NUMBER: "Số tự động",
  USER: "Người dùng",
  MKT_LIST: "Danh bạ Marketing",
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

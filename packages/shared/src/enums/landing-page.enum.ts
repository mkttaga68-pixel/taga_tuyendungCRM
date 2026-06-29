export const LANDING_PAGE_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"] as const;
export type LandingPageStatus = (typeof LANDING_PAGE_STATUSES)[number];

export const LANDING_PAGE_STATUS_LABELS: Record<LandingPageStatus, string> = {
  DRAFT: "Bản nháp",
  ACTIVE: "Đang chạy",
  PAUSED: "Tạm dừng",
  ARCHIVED: "Lưu trữ",
};

export const SUBMISSION_PROCESSING_STATUSES = [
  "PENDING",
  "PROCESSED",
  "DUPLICATE",
  "ERROR",
] as const;
export type SubmissionProcessingStatus = (typeof SUBMISSION_PROCESSING_STATUSES)[number];

export const SUBMISSION_PROCESSING_STATUS_LABELS: Record<SubmissionProcessingStatus, string> = {
  PENDING: "Đang xử lý",
  PROCESSED: "Đã tạo ứng viên",
  DUPLICATE: "Trùng ứng viên có sẵn",
  ERROR: "Lỗi",
};

/**
 * Kiểu field mà Form Builder cho phép dựng trên 1 Landing Page form — tập con
 * của FIELD_TYPES (Dynamic Field Engine) phù hợp với 1 form public, không cần
 * các kiểu chỉ có ý nghĩa trên bảng dữ liệu nội bộ (FORMULA/LOOKUP/RELATION...).
 */
export const FORM_FIELD_TYPES = [
  "TEXT",
  "LONG_TEXT",
  "PHONE",
  "EMAIL",
  "DATE",
  "SELECT",
  "CHECKBOX",
  "FILE",
] as const;
export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export const FORM_FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  TEXT: "Văn bản ngắn",
  LONG_TEXT: "Văn bản dài",
  PHONE: "Số điện thoại",
  EMAIL: "Email",
  DATE: "Ngày",
  SELECT: "Lựa chọn (dropdown)",
  CHECKBOX: "Câu hỏi Có/Không",
  FILE: "Tệp đính kèm (CV)",
};

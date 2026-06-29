export const AUTOMATION_TRIGGER_TYPES = [
  "RECORD_CREATED",
  "FIELD_CHANGED",
  "SCHEDULED",
  "WEBHOOK",
] as const;
export type AutomationTriggerType = (typeof AUTOMATION_TRIGGER_TYPES)[number];

export const AUTOMATION_TRIGGER_TYPE_LABELS: Record<AutomationTriggerType, string> = {
  RECORD_CREATED: "Khi tạo ứng viên mới",
  FIELD_CHANGED: "Khi 1 field thay đổi",
  SCHEDULED: "Theo lịch (cron)",
  WEBHOOK: "Khi nhận Webhook",
};

export const AUTOMATION_NODE_TYPES = [
  "IF",
  "ELSE",
  "SWITCH",
  "DELAY",
  "WAIT",
  "WEBHOOK",
  "EMAIL",
  "SMS",
  "TELEGRAM",
  "SLACK",
  "NOTIFICATION",
  "GOOGLE_CALENDAR",
  "GOOGLE_MEET",
  "UPDATE_RECORD",
  "CREATE_RECORD",
  "DELETE_RECORD",
  "CONDITION",
  "LOOP",
  "FUNCTION",
] as const;
export type AutomationNodeType = (typeof AUTOMATION_NODE_TYPES)[number];

export const AUTOMATION_NODE_TYPE_LABELS: Record<AutomationNodeType, string> = {
  IF: "Điều kiện (If)",
  ELSE: "Else",
  SWITCH: "Switch (nhiều nhánh)",
  DELAY: "Trễ (Delay)",
  WAIT: "Đợi đến thời điểm",
  WEBHOOK: "Gọi Webhook",
  EMAIL: "Gửi Email",
  SMS: "Gửi SMS",
  TELEGRAM: "Gửi Telegram",
  SLACK: "Gửi Slack",
  NOTIFICATION: "Thông báo trong app",
  GOOGLE_CALENDAR: "Tạo Google Calendar event",
  GOOGLE_MEET: "Tạo Google Meet",
  UPDATE_RECORD: "Cập nhật bản ghi",
  CREATE_RECORD: "Tạo bản ghi mới",
  DELETE_RECORD: "Xoá bản ghi",
  CONDITION: "Điều kiện (Condition)",
  LOOP: "Lặp (Loop)",
  FUNCTION: "Function (JS tuỳ chỉnh)",
};

export const AUTOMATION_NODE_CATEGORY: Record<AutomationNodeType, "trigger" | "logic" | "action"> = {
  IF: "logic",
  ELSE: "logic",
  SWITCH: "logic",
  DELAY: "logic",
  WAIT: "logic",
  CONDITION: "logic",
  LOOP: "logic",
  FUNCTION: "logic",
  WEBHOOK: "action",
  EMAIL: "action",
  SMS: "action",
  TELEGRAM: "action",
  SLACK: "action",
  NOTIFICATION: "action",
  GOOGLE_CALENDAR: "action",
  GOOGLE_MEET: "action",
  UPDATE_RECORD: "action",
  CREATE_RECORD: "action",
  DELETE_RECORD: "action",
};

/**
 * Tất cả node type hiện đã có executor thật trong apps/worker, kể cả
 * GOOGLE_CALENDAR/GOOGLE_MEET (cần Recruiter của candidate đã connect Google
 * ở Cài đặt > Tích hợp, nếu chưa connect node sẽ FAILED với lỗi rõ ràng).
 * Giữ lại set rỗng để UI cũ còn gọi `.has(type)` không cần sửa.
 */
export const DEFERRED_NODE_TYPES: ReadonlySet<AutomationNodeType> = new Set([]);

export const AUTOMATION_RUN_STATUSES = ["RUNNING", "SUCCESS", "FAILED"] as const;
export type AutomationRunStatus = (typeof AUTOMATION_RUN_STATUSES)[number];

export const AUTOMATION_RUN_STATUS_LABELS: Record<AutomationRunStatus, string> = {
  RUNNING: "Đang chạy",
  SUCCESS: "Thành công",
  FAILED: "Lỗi",
};

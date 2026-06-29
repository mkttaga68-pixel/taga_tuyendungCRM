/** Tên queue BullMQ dùng chung giữa apps/api (enqueue) và apps/worker (xử lý). */
export const AUTOMATION_QUEUE_NAME = "automation";

export interface AutomationJobData {
  runId: string;
  workflowId: string;
  triggerRecordTable: string;
  triggerRecordId: string | null;
  /** Có khi job này là resume sau DELAY/WAIT — bỏ qua entry node, chạy tiếp từ đây. */
  resumeFromNodeKey?: string;
  /** Scratch state mang theo giữa các lần resume (vars, loop state...). */
  vars?: Record<string, unknown>;
}

/** Sprint 7 — job rollup KPI ngày vào landing_page_metrics_daily (cron + trigger thủ công). */
export const REPORTS_ROLLUP_QUEUE_NAME = "reports-rollup";

export interface ReportsRollupJobData {
  /** "YYYY-MM-DD" — ngày cần rollup. Để trống = hôm qua (theo giờ UTC). */
  targetDate?: string;
}

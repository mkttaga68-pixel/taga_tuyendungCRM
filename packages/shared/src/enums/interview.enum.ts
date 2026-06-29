export const INTERVIEW_RESULTS = ["PENDING", "PASSED", "FAILED", "RESCHEDULED", "NO_SHOW"] as const;
export type InterviewResult = (typeof INTERVIEW_RESULTS)[number];

export const INTERVIEW_RESULT_LABELS: Record<InterviewResult, string> = {
  PENDING: "Chờ kết quả",
  PASSED: "Đậu",
  FAILED: "Rớt",
  RESCHEDULED: "Dời lịch",
  NO_SHOW: "Không đến",
};

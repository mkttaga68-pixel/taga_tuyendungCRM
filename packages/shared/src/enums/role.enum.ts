export const ROLES = ["ADMIN", "HR_MANAGER", "RECRUITER", "INTERVIEWER", "VIEWER"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  HR_MANAGER: "HR Manager",
  RECRUITER: "Recruiter",
  INTERVIEWER: "Interviewer",
  VIEWER: "Viewer",
};

/**
 * Role nào được xem toàn bộ candidates (bỏ qua row-level scoping theo recruiter_id).
 * Viewer = chỉ đọc nhưng xem được hết (đúng bản chất "Viewer" trong CRM/Airtable).
 * Recruiter/Interviewer chỉ thấy bản ghi được gán cho mình (interviewer_id sẽ tách
 * riêng từ Sprint 4 khi module Lịch phỏng vấn xong — hiện tạm dùng chung recruiter_id).
 */
export const ROLES_WITH_FULL_VISIBILITY: ReadonlySet<Role> = new Set(["ADMIN", "HR_MANAGER", "VIEWER"]);

import { OPERATORS_WITHOUT_VALUE, type FilterCondition } from "@taga-crm/shared";

/**
 * Lọc bỏ điều kiện chưa đủ giá trị trước khi gửi API/build query key — UI cho phép
 * giữ 1 dòng filter "đang nhập" (đã chọn field+operator nhưng chưa chọn value) để
 * người dùng hoàn thiện dần, nhưng dòng đó không được áp dụng vào query thật.
 */
export function isFilterConditionComplete(condition: FilterCondition): boolean {
  if (OPERATORS_WITHOUT_VALUE.has(condition.operator)) return true;
  const value = condition.value;
  if (value === undefined || value === null || value === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

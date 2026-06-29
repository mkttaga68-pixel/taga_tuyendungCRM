import type { FilterCondition } from "../schemas/view.schema";

/**
 * Đánh giá 1 FilterCondition trên 1 record JS thường (không qua SQL) — dùng
 * bởi Automation Engine (node IF/CONDITION/SWITCH) chạy trong apps/worker,
 * nơi không có sẵn câu SQL như candidates-query.util.ts bên apps/api.
 * Cùng bộ operator với FILTER_OPERATORS để hành vi nhất quán với Grid.
 */
export function evaluateFilterCondition(
  record: Record<string, unknown>,
  condition: FilterCondition,
): boolean {
  const raw = record[condition.fieldKey];
  const { operator, value } = condition;

  switch (operator) {
    case "is_empty":
      return raw === null || raw === undefined || raw === "";
    case "is_not_empty":
      return !(raw === null || raw === undefined || raw === "");
    case "equals":
      return String(raw ?? "") === String(value ?? "");
    case "not_equals":
      return String(raw ?? "") !== String(value ?? "");
    case "contains":
      return String(raw ?? "")
        .toLowerCase()
        .includes(String(value ?? "").toLowerCase());
    case "not_contains":
      return !String(raw ?? "")
        .toLowerCase()
        .includes(String(value ?? "").toLowerCase());
    case "gt":
      return toNumber(raw) > toNumber(value);
    case "gte":
      return toNumber(raw) >= toNumber(value);
    case "lt":
      return toNumber(raw) < toNumber(value);
    case "lte":
      return toNumber(raw) <= toNumber(value);
    case "before":
      return toTime(raw) < toTime(value);
    case "after":
      return toTime(raw) > toTime(value);
    case "on_or_before":
      return toTime(raw) <= toTime(value);
    case "on_or_after":
      return toTime(raw) >= toTime(value);
    case "is_any_of":
      return Array.isArray(value) && value.map(String).includes(String(raw ?? ""));
    case "is_none_of":
      return !(Array.isArray(value) && value.map(String).includes(String(raw ?? "")));
    case "has_any_of":
      return arr(raw).some((v) => arr(value).includes(v));
    case "has_all_of":
      return arr(value).every((v) => arr(raw).includes(v));
    case "has_none_of":
      return !arr(raw).some((v) => arr(value).includes(v));
    default:
      return false;
  }
}

function toNumber(v: unknown): number {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function toTime(v: unknown): number {
  const t = new Date(String(v ?? "")).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String) : [];
}

import type { CandidateDto, ColorRule, FieldDefinitionDto, FilterCondition } from "@taga-crm/shared";
import { getPreviousRawValue } from "./candidate-field-value";
import { isFilterConditionComplete } from "./filter-condition.util";

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function evaluateCondition(
  candidate: CandidateDto,
  field: FieldDefinitionDto,
  condition: FilterCondition,
): boolean {
  const raw = getPreviousRawValue(candidate, field);

  switch (condition.operator) {
    case "is_empty":
      return isEmpty(raw);
    case "is_not_empty":
      return !isEmpty(raw);
    case "equals":
      return String(raw ?? "") === String(condition.value ?? "");
    case "not_equals":
      return String(raw ?? "") !== String(condition.value ?? "");
    case "contains":
      return String(raw ?? "")
        .toLowerCase()
        .includes(String(condition.value ?? "").toLowerCase());
    case "not_contains":
      return !String(raw ?? "")
        .toLowerCase()
        .includes(String(condition.value ?? "").toLowerCase());
    case "gt":
      return Number(raw) > Number(condition.value);
    case "gte":
      return Number(raw) >= Number(condition.value);
    case "lt":
      return Number(raw) < Number(condition.value);
    case "lte":
      return Number(raw) <= Number(condition.value);
    case "before":
      return raw != null && new Date(String(raw)) < new Date(String(condition.value));
    case "after":
      return raw != null && new Date(String(raw)) > new Date(String(condition.value));
    case "on_or_before":
      return raw != null && new Date(String(raw)) <= new Date(String(condition.value));
    case "on_or_after":
      return raw != null && new Date(String(raw)) >= new Date(String(condition.value));
    case "is_any_of": {
      const values = Array.isArray(condition.value) ? condition.value.map(String) : [];
      return values.includes(String(raw ?? ""));
    }
    case "is_none_of": {
      const values = Array.isArray(condition.value) ? condition.value.map(String) : [];
      return !values.includes(String(raw ?? ""));
    }
    case "has_any_of": {
      const values = Array.isArray(condition.value) ? condition.value.map(String) : [];
      const rawArray = Array.isArray(raw) ? raw.map(String) : [];
      return values.some((v) => rawArray.includes(v));
    }
    case "has_all_of": {
      const values = Array.isArray(condition.value) ? condition.value.map(String) : [];
      const rawArray = Array.isArray(raw) ? raw.map(String) : [];
      return values.every((v) => rawArray.includes(v));
    }
    case "has_none_of": {
      const values = Array.isArray(condition.value) ? condition.value.map(String) : [];
      const rawArray = Array.isArray(raw) ? raw.map(String) : [];
      return values.every((v) => !rawArray.includes(v));
    }
    default:
      return false;
  }
}

/** Trả về màu của quy tắc đầu tiên khớp (ưu tiên theo thứ tự khai báo) — null nếu không khớp gì. */
export function resolveRowColor(
  candidate: CandidateDto,
  colorRules: ColorRule[],
  fieldsByKey: Map<string, FieldDefinitionDto>,
): string | null {
  for (const rule of colorRules) {
    if (rule.filters.length === 0 || !rule.filters.every(isFilterConditionComplete)) continue;
    const allMatch = rule.filters.every((condition) => {
      const field = fieldsByKey.get(condition.fieldKey);
      if (!field) return false;
      return evaluateCondition(candidate, field, condition);
    });
    if (allMatch) return rule.color;
  }
  return null;
}

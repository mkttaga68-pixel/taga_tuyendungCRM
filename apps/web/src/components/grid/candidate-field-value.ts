import type { CandidateDto, FieldDefinitionDto } from "@taga-crm/shared";

/** Field hệ thống không lưu giá trị scalar trực tiếp mà là object quan hệ {id,label}. */
const RELATION_LIKE_KEYS = new Set(["statusId", "recruiterId", "landingPageId"]);

/** Khớp với READONLY_SYSTEM_FIELD_KEYS ở backend — không cho mở edit mode ở các field này. */
export const READONLY_FIELD_KEYS = new Set([
  "createdAt",
  "updatedAt",
  "firstUtmSource",
  "firstUtmMedium",
  "firstUtmCampaign",
  "firstUtmContent",
  "firstUtmTerm",
  "firstIp",
  "firstDevice",
  "firstOs",
  "firstBrowser",
  "firstReferrer",
  "landingPageId",
  "lastEmailLog",
]);

/** RELATION sửa qua popover riêng (xem relation-cell-editor.tsx), không qua CellEditor mặc định. */
export function isFieldEditable(field: FieldDefinitionDto): boolean {
  if (READONLY_FIELD_KEYS.has(field.fieldKey)) return false;
  return ![
    "IMAGE",
    "ATTACHMENT",
    "FORMULA",
    "LOOKUP",
    "ROLLUP",
    "RELATION",
    "AUTO_NUMBER",
  ].includes(field.fieldType);
}

export function getCellValue(candidate: CandidateDto, field: FieldDefinitionDto): unknown {
  if (!field.isSystem) {
    return candidate.customFields[field.fieldKey];
  }

  switch (field.fieldKey) {
    case "statusId":
      return candidate.status;
    case "recruiterId":
      return candidate.recruiter;
    case "landingPageId":
      return candidate.landingPage;
    case "lastEmailLog": {
      const log = candidate.lastEmailLog;
      if (!log) return null;
      const d = new Date(log.sentAt);
      const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
      return `${log.subject} · ${dateStr}`;
    }
    default:
      return (candidate as unknown as Record<string, unknown>)[field.fieldKey];
  }
}

export function getCellDisplayText(candidate: CandidateDto, field: FieldDefinitionDto): string {
  const value = getCellValue(candidate, field);
  if (value === null || value === undefined || value === "") return "";

  if (RELATION_LIKE_KEYS.has(field.fieldKey)) {
    const ref = value as { label?: string; fullName?: string; name?: string } | null;
    return ref?.label ?? ref?.fullName ?? ref?.name ?? "";
  }

  if (Array.isArray(value)) {
    return value
      .map((v) => (v && typeof v === "object" && "label" in v ? String((v as { label: unknown }).label) : String(v)))
      .join(", ");
  }
  if (field.fieldType === "CHECKBOX") return value ? "✓" : "";
  return String(value);
}

/** id để gửi lên API khi sửa field hệ thống dạng quan hệ (statusId/recruiterId/landingPageId). */
export function getRelationId(
  candidate: CandidateDto,
  fieldKey: "statusId" | "recruiterId" | "landingPageId",
): string | null {
  const ref =
    fieldKey === "statusId"
      ? candidate.status
      : fieldKey === "recruiterId"
        ? candidate.recruiter
        : candidate.landingPage;
  return ref?.id ?? null;
}

/** Giá trị "thô" để lưu vào undo stack — id cho field quan hệ, giá trị thật cho field khác. */
export function getPreviousRawValue(candidate: CandidateDto, field: FieldDefinitionDto): unknown {
  if (field.fieldKey === "statusId" || field.fieldKey === "recruiterId" || field.fieldKey === "landingPageId") {
    return getRelationId(candidate, field.fieldKey);
  }
  return getCellValue(candidate, field);
}

interface SelectChoice {
  value: string;
  label: string;
}

const EMPTY_GROUP_LABEL = "(Trống)";

/** Label người-đọc-được cho group header — khác getCellDisplayText ở chỗ resolve cả nhãn SELECT (gender/source). */
export function getGroupLabel(candidate: CandidateDto, field: FieldDefinitionDto): string {
  const value = getCellValue(candidate, field);
  if (value === null || value === undefined || value === "") return EMPTY_GROUP_LABEL;

  if (RELATION_LIKE_KEYS.has(field.fieldKey)) {
    const ref = value as { label?: string; fullName?: string; name?: string } | null;
    return ref?.label ?? ref?.fullName ?? ref?.name ?? EMPTY_GROUP_LABEL;
  }

  if (field.fieldType === "SELECT") {
    const choices = (field.options?.choices as SelectChoice[] | undefined) ?? [];
    const choice = choices.find((c) => c.value === value);
    if (choice) return choice.label;
  }

  if (field.fieldType === "CHECKBOX") return value ? "Có" : "Không";
  if (Array.isArray(value)) {
    if (value.length === 0) return EMPTY_GROUP_LABEL;
    return value
      .map((v) => (v && typeof v === "object" && "label" in v ? String((v as { label: unknown }).label) : String(v)))
      .join(", ");
  }
  return String(value);
}

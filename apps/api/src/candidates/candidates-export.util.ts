import ExcelJS from "exceljs";
import type { CandidateDto, ExportFormat, FieldDefinitionDto } from "@taga-crm/shared";

interface SelectChoice {
  value: string;
  label: string;
}

const RELATION_LIKE_KEYS = new Set(["statusId", "recruiterId", "landingPageId"]);

function getExportCellValue(
  candidate: CandidateDto,
  field: FieldDefinitionDto,
): string | number | boolean {
  if (RELATION_LIKE_KEYS.has(field.fieldKey)) {
    if (field.fieldKey === "statusId") return candidate.status?.label ?? "";
    if (field.fieldKey === "recruiterId") return candidate.recruiter?.fullName ?? "";
    return candidate.landingPage?.name ?? "";
  }

  const raw: unknown = field.isSystem
    ? (candidate as unknown as Record<string, unknown>)[field.fieldKey]
    : candidate.customFields[field.fieldKey];

  if (raw === null || raw === undefined) return "";

  if (field.fieldType === "SELECT") {
    const choices = (field.options?.choices as SelectChoice[] | undefined) ?? [];
    const choice = choices.find((c) => c.value === raw);
    if (choice) return choice.label;
    return typeof raw === "string" || typeof raw === "number" ? raw : JSON.stringify(raw);
  }
  if (field.fieldType === "MULTI_SELECT" && Array.isArray(raw)) {
    return raw.join(", ");
  }
  if (field.fieldType === "CHECKBOX") return Boolean(raw);
  if (Array.isArray(raw)) return raw.join(", ");
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  if (typeof raw === "object") return JSON.stringify(raw);
  return raw as string | number | boolean;
}

export async function buildCandidatesExportBuffer(
  rows: CandidateDto[],
  fields: FieldDefinitionDto[],
  format: ExportFormat,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Ứng viên");
  sheet.columns = fields.map((field) => ({
    header: field.label,
    key: field.fieldKey,
    width: Math.max(12, Math.round(field.width / 7)),
    // SĐT có thể bắt đầu bằng số 0 — format "@" (Text) để Excel không tự ép thành số làm mất số 0.
    style: field.fieldType === "PHONE" ? { numFmt: "@" } : undefined,
  }));

  for (const candidate of rows) {
    const rowData: Record<string, string | number | boolean> = {};
    for (const field of fields) {
      rowData[field.fieldKey] = getExportCellValue(candidate, field);
    }
    sheet.addRow(rowData);
  }

  sheet.getRow(1).font = { bold: true };

  if (format === "csv") {
    return workbook.csv.writeBuffer() as unknown as Promise<Buffer>;
  }
  return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

import { Readable } from "node:stream";
import ExcelJS from "exceljs";
import type { FieldDefinition, PipelineStage } from "@prisma/client";

export interface ParsedImportRow {
  rowNumber: number;
  values: Record<string, unknown>;
  error?: string;
}

interface SelectChoice {
  value: string;
  label: string;
}

interface ImportUserRef {
  id: string;
  fullName: string;
}

const TRUE_TEXTS = new Set(["true", "1", "có", "co", "yes", "x", "✓"]);

/** ExcelJS.CellValue có thể là object (rich text/formula/error) — tránh String() trần gây "[object Object]". */
function cellValueToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value && value.result !== undefined && value.result !== null) {
      return cellValueToString(value.result);
    }
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part: { text: string }) => part.text).join("");
    }
    return "";
  }
  return String(value);
}

function coerceImportCellValue(
  field: FieldDefinition,
  cellValue: ExcelJS.CellValue,
  stageIdByLabel: Map<string, string>,
  userIdByName: Map<string, string>,
): unknown {
  if (cellValue === null || cellValue === undefined) return undefined;
  const text = cellValueToString(cellValue).trim();
  if (!text) return undefined;

  if (field.fieldKey === "statusId") {
    const id = stageIdByLabel.get(text.toLowerCase());
    if (!id) throw new Error(`Không tìm thấy Next Step "${text}"`);
    return id;
  }
  if (field.fieldKey === "recruiterId") {
    const id = userIdByName.get(text.toLowerCase());
    if (!id) throw new Error(`Không tìm thấy Recruiter "${text}"`);
    return id;
  }

  switch (field.fieldType) {
    case "NUMBER":
    case "RATING":
    case "CURRENCY":
    case "PERCENT": {
      const n = Number(text.replace(/,/g, ""));
      if (Number.isNaN(n)) throw new Error(`Giá trị số không hợp lệ: "${text}"`);
      return n;
    }
    case "CHECKBOX":
      return TRUE_TEXTS.has(text.toLowerCase());
    case "DATE":
    case "DATETIME": {
      const date = cellValue instanceof Date ? cellValue : new Date(text);
      if (Number.isNaN(date.getTime())) throw new Error(`Ngày không hợp lệ: "${text}"`);
      return date.toISOString();
    }
    case "MULTI_SELECT": {
      const choices = (field.options as { choices?: SelectChoice[] } | null)?.choices ?? [];
      const parts = text
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      if (choices.length === 0) return parts;
      return parts.map(
        (p) => choices.find((c) => c.label.toLowerCase() === p.toLowerCase())?.value ?? p,
      );
    }
    case "SELECT": {
      const choices = (field.options as { choices?: SelectChoice[] } | null)?.choices ?? [];
      if (choices.length === 0) return text;
      const found = choices.find(
        (c) =>
          c.label.toLowerCase() === text.toLowerCase() ||
          c.value.toLowerCase() === text.toLowerCase(),
      );
      return found?.value ?? text;
    }
    default:
      return text;
  }
}

export async function parseImportFile(
  buffer: Buffer,
  mimeType: string,
  fieldDefs: FieldDefinition[],
  pipelineStages: PipelineStage[],
  users: ImportUserRef[],
): Promise<ParsedImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  const isCsv = mimeType.includes("csv") || mimeType === "text/plain";
  if (isCsv) {
    // exceljs mặc định tự ép cell CSV giống số thành Number (Number("0911...") mất số 0 đầu) —
    // giữ nguyên string thô, để coerceImportCellValue tự convert đúng theo field type khai báo.
    await workbook.csv.read(Readable.from(buffer), {
      map: (datum: string) => (datum === "" ? null : datum),
    });
  } else {
    // exceljs ship type def Buffer cũ hơn @types/node hiện tại (Buffer generic) — ép kiểu an toàn vì cùng là Buffer thật lúc runtime.
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const labelToField = new Map(fieldDefs.map((f) => [f.label.trim().toLowerCase(), f]));
  const colFieldMap = new Map<number, FieldDefinition>();
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const label = cellValueToString(cell.value).trim().toLowerCase();
    const field = labelToField.get(label);
    if (field) colFieldMap.set(colNumber, field);
  });

  const stageIdByLabel = new Map(pipelineStages.map((s) => [s.label.trim().toLowerCase(), s.id]));
  const userIdByName = new Map(users.map((u) => [u.fullName.trim().toLowerCase(), u.id]));

  const rows: ParsedImportRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    let hasAnyValue = false;
    const values: Record<string, unknown> = {};
    let rowError: string | undefined;

    colFieldMap.forEach((field, colNumber) => {
      const cellValue = row.getCell(colNumber).value;
      if (cellValueToString(cellValue).trim() !== "") {
        hasAnyValue = true;
      }
      try {
        const coerced = coerceImportCellValue(field, cellValue, stageIdByLabel, userIdByName);
        if (coerced !== undefined) values[field.fieldKey] = coerced;
      } catch (err) {
        rowError = err instanceof Error ? err.message : String(err);
      }
    });

    if (!hasAnyValue) return;
    rows.push({ rowNumber, values, error: rowError });
  });

  return rows;
}

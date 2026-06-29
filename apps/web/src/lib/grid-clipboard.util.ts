/** Chuyển giá trị cell thành text để copy ra clipboard hệ điều hành (TSV — giống Excel/Sheets). */
export function cellValueToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    const maybeLabel = (value as { label?: unknown }).label;
    return typeof maybeLabel === "string" ? maybeLabel : JSON.stringify(value);
  }
  return String(value);
}

export function rowsToTsv(rows: string[][]): string {
  return rows.map((row) => row.map((cell) => cell.replaceAll("\t", " ")).join("\t")).join("\n");
}

export function tsvToRows(text: string): string[][] {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .filter((line, index, all) => !(index === all.length - 1 && line === ""))
    .map((line) => line.split("\t"));
}

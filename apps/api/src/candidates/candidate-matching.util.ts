/** Chuẩn hoá SĐT Việt Nam về dạng "0xxxxxxxxx" để so khớp dedup ổn định,
 * bất kể ứng viên nhập có dấu cách/gạch ngang/+84 hay không. */
export function normalizeVnPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.toString().replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("84") && digits.length > 9) {
    digits = `0${digits.slice(2)}`;
  } else if (!digits.startsWith("0")) {
    digits = `0${digits}`;
  }
  return digits;
}

export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.toString().trim().toLowerCase();
  return trimmed || null;
}

export interface ParsedUtm {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  ttclid: string | null;
}

/** pageUrl do FE gửi lên (window.location.href) — chứa toàn bộ query string gốc. */
export function parseUtmFromPageUrl(pageUrl: string | null | undefined): ParsedUtm {
  const empty: ParsedUtm = {
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
    ttclid: null,
  };
  if (!pageUrl) return empty;
  try {
    const params = new URL(pageUrl).searchParams;
    return {
      utmSource: params.get("utm_source"),
      utmMedium: params.get("utm_medium"),
      utmCampaign: params.get("utm_campaign"),
      utmContent: params.get("utm_content"),
      utmTerm: params.get("utm_term"),
      ttclid: params.get("ttclid"),
    };
  } catch {
    return empty;
  }
}

/** Form values từ public submit có thể là string/number/boolean — không bao
 * giờ là object lồng (đến từ JSON body hoặc urlencoded form field thẳng). */
export function toStringValueOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

export function guessCvMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
}

import { createSign } from "node:crypto";

/**
 * Đọc/gọi GA4 Data API bằng Service Account (JWT Bearer Grant, RFC 7523) — KHÔNG
 * dùng OAuth2 theo user như Google Calendar (xem apps/api/src/integrations/google),
 * vì đây là số liệu analytics chung của cả property GA4, không thuộc về 1 user
 * nào. Chỉ cần fetch + node:crypto, không thêm thư viện `google-auth-library`
 * để tránh kéo thêm dependency nặng cho 1 luồng gọi REST đơn giản. File này CHỈ
 * sống trong apps/worker (không export qua packages/shared) vì dùng `node:crypto`
 * — nếu để trong shared, Next.js có thể cố bundle nó vào client và vỡ build.
 */

const GA4_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GA4_DATA_API = "https://analyticsdata.googleapis.com/v1beta";
const GA4_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

export interface Ga4DailyMetrics {
  date: string;
  visitors: number;
  sessions: number;
  pageViews: number;
  bounceRate: number;
  avgTimeSeconds: number;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function parseServiceAccount(): ServiceAccountKey {
  const raw = process.env.GOOGLE_GA4_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      "GOOGLE_GA4_SERVICE_ACCOUNT_JSON chưa được cấu hình — không thể gọi GA4 Data API",
    );
  }
  let parsed: ServiceAccountKey;
  try {
    parsed = JSON.parse(raw) as ServiceAccountKey;
  } catch {
    throw new Error("GOOGLE_GA4_SERVICE_ACCOUNT_JSON không phải JSON hợp lệ");
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("GOOGLE_GA4_SERVICE_ACCOUNT_JSON thiếu client_email/private_key");
  }
  return parsed;
}

async function getServiceAccountAccessToken(account: ServiceAccountKey): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: GA4_SCOPE,
      aud: GA4_TOKEN_URL,
      iat: nowSec,
      exp: nowSec + 3600,
    }),
  );
  const signatureInput = `${header}.${claims}`;
  const signature = createSign("RSA-SHA256").update(signatureInput).sign(account.private_key, "base64url");
  const assertion = `${signatureInput}.${signature}`;

  const res = await fetch(GA4_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const body = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!res.ok || !body.access_token) {
    throw new Error(body.error_description || body.error || `GA4 token request lỗi HTTP ${res.status}`);
  }
  return body.access_token;
}

interface Ga4RunReportRow {
  dimensionValues: { value: string }[];
  metricValues: { value: string }[];
}
interface Ga4RunReportResponse {
  rows?: Ga4RunReportRow[];
  error?: { message?: string };
}

/** Lấy visitors/sessions/pageViews/bounceRate/avgTimeSeconds cho 1 ngày của 1 GA4 property. */
export async function fetchGa4DailyMetrics(propertyId: string, dateIso: string): Promise<Ga4DailyMetrics> {
  const account = parseServiceAccount();
  const accessToken = await getServiceAccountAccessToken(account);

  const res = await fetch(`${GA4_DATA_API}/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: dateIso, endDate: dateIso }],
      metrics: [
        { name: "totalUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "bounceRate" },
        { name: "averageSessionDuration" },
      ],
    }),
  });
  const json = (await res.json()) as Ga4RunReportResponse;
  if (!res.ok) {
    throw new Error(json.error?.message || `GA4 Data API lỗi HTTP ${res.status}`);
  }

  const values = json.rows?.[0]?.metricValues ?? [];
  const num = (index: number) => Number(values[index]?.value ?? 0);

  return {
    date: dateIso,
    visitors: num(0),
    sessions: num(1),
    pageViews: num(2),
    bounceRate: num(3),
    avgTimeSeconds: num(4),
  };
}

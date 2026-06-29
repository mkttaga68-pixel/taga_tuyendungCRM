const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_CALENDAR_SCOPES =
  "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email";

export interface GoogleOAuthCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleAccessTokenResult {
  accessToken: string;
  expiresAt: Date;
  scope: string;
}

export interface GoogleExchangeResult extends GoogleAccessTokenResult {
  refreshToken: string;
}

interface GoogleTokenErrorBody {
  error?: string;
  error_description?: string;
}

interface GoogleTokenSuccessBody {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
}

function googleErrorMessage(body: GoogleTokenErrorBody, status: number): string {
  return body.error_description || body.error || `Google API trả lỗi HTTP ${status}`;
}

export function buildGoogleAuthUrl(creds: GoogleOAuthCredentials, state: string): string {
  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: creds.redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: GOOGLE_CALENDAR_SCOPES,
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleAuthCode(
  creds: GoogleOAuthCredentials,
  code: string,
): Promise<GoogleExchangeResult> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      redirect_uri: creds.redirectUri,
      code,
      grant_type: "authorization_code",
    }),
  });
  const body = (await res.json()) as GoogleTokenSuccessBody & GoogleTokenErrorBody;
  if (!res.ok) {
    throw new Error(googleErrorMessage(body, res.status));
  }
  if (!body.refresh_token) {
    throw new Error(
      "Google không trả về refresh_token — vào myaccount.google.com/permissions để gỡ quyền truy cập cũ của app này rồi kết nối lại",
    );
  }
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: new Date(Date.now() + body.expires_in * 1000),
    scope: body.scope,
  };
}

export async function refreshGoogleAccessToken(
  creds: GoogleOAuthCredentials,
  refreshToken: string,
): Promise<GoogleAccessTokenResult> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const body = (await res.json()) as GoogleTokenSuccessBody & GoogleTokenErrorBody;
  if (!res.ok) {
    throw new Error(googleErrorMessage(body, res.status));
  }
  return {
    accessToken: body.access_token,
    expiresAt: new Date(Date.now() + body.expires_in * 1000),
    scope: body.scope,
  };
}

export async function fetchGoogleUserEmail(accessToken: string): Promise<string | null> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { email?: string };
  return body.email ?? null;
}

export interface CreateGoogleCalendarEventInput {
  accessToken: string;
  summary: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  attendeeEmails?: string[];
  withMeet: boolean;
}

export interface CreateGoogleCalendarEventResult {
  eventId: string;
  htmlLink: string;
  meetLink: string | null;
}

interface GoogleCalendarEventResponse {
  id: string;
  htmlLink: string;
  conferenceData?: {
    entryPoints?: Array<{ entryPointType: string; uri: string }>;
  };
  error?: { message?: string };
}

export async function createGoogleCalendarEvent(
  input: CreateGoogleCalendarEventInput,
): Promise<CreateGoogleCalendarEventResult> {
  const body: Record<string, unknown> = {
    summary: input.summary,
    description: input.description,
    start: { dateTime: input.startDateTime },
    end: { dateTime: input.endDateTime },
    attendees: (input.attendeeEmails ?? []).map((email) => ({ email })),
  };
  if (input.withMeet) {
    body.conferenceData = {
      createRequest: {
        requestId: `taga-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  const url = `${GOOGLE_CALENDAR_API}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as GoogleCalendarEventResponse;
  if (!res.ok) {
    throw new Error(json.error?.message || `Google Calendar API lỗi HTTP ${res.status}`);
  }
  const meetLink =
    json.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ?? null;
  return { eventId: json.id, htmlLink: json.htmlLink, meetLink };
}

export async function deleteGoogleCalendarEvent(accessToken: string, eventId: string): Promise<void> {
  const url = `${GOOGLE_CALENDAR_API}/calendars/primary/events/${encodeURIComponent(eventId)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(json.error?.message || `Google Calendar xoá event lỗi HTTP ${res.status}`);
  }
}

export interface GoogleFreeBusyRange {
  start: string;
  end: string;
}

interface GoogleFreeBusyResponse {
  calendars?: { primary?: { busy?: GoogleFreeBusyRange[] } };
  error?: { message?: string };
}

export async function checkGoogleFreeBusy(
  accessToken: string,
  startDateTime: string,
  endDateTime: string,
): Promise<GoogleFreeBusyRange[]> {
  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: startDateTime,
      timeMax: endDateTime,
      items: [{ id: "primary" }],
    }),
  });
  const json = (await res.json()) as GoogleFreeBusyResponse;
  if (!res.ok) {
    throw new Error(json.error?.message || `Google FreeBusy API lỗi HTTP ${res.status}`);
  }
  return json.calendars?.primary?.busy ?? [];
}

/** scheduledTime đến từ <input type="time"> nên luôn ở dạng "HH:mm" (24h). */
export function buildVnDateTimeRange(
  scheduledDateIso: string,
  scheduledTime: string,
  durationMinutes: number,
): { startDateTime: string; endDateTime: string } {
  if (!/^\d{2}:\d{2}$/.test(scheduledTime)) {
    throw new Error(
      `Giờ phỏng vấn "${scheduledTime}" không đúng định dạng HH:mm — không thể tạo Google Calendar event`,
    );
  }
  const start = new Date(`${scheduledDateIso}T${scheduledTime}:00+07:00`);
  if (Number.isNaN(start.getTime())) {
    throw new Error(`Ngày/giờ phỏng vấn không hợp lệ: ${scheduledDateIso} ${scheduledTime}`);
  }
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return { startDateTime: start.toISOString(), endDateTime: end.toISOString() };
}

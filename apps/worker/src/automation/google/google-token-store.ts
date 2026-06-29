import type { PrismaClient } from "@prisma/client";
import { refreshGoogleAccessToken, type GoogleOAuthCredentials } from "@taga-crm/shared";

/** Refresh sớm 60s trước khi hết hạn thật để tránh race condition lúc gọi Calendar API. */
const TOKEN_REFRESH_SKEW_MS = 60 * 1000;

function getCredentials(): GoogleOAuthCredentials {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Google OAuth chưa được cấu hình (thiếu GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI trong .env)",
    );
  }
  return { clientId, clientSecret, redirectUri };
}

/** Bản song song của GoogleTokenService.getValidAccessToken (apps/api) — worker không dùng NestJS nên không inject được service đó, đọc trực tiếp cùng bảng google_oauth_tokens qua Prisma riêng của worker. */
export async function getValidGoogleAccessToken(prisma: PrismaClient, userId: string): Promise<string> {
  const row = await prisma.googleOAuthToken.findUnique({ where: { userId } });
  if (!row) {
    throw new Error(
      "Người được gán (Recruiter) chưa kết nối Google Calendar — vào Cài đặt > Tích hợp để kết nối trước",
    );
  }

  if (row.expiresAt.getTime() - TOKEN_REFRESH_SKEW_MS > Date.now()) {
    return row.accessToken;
  }

  const creds = getCredentials();
  const refreshed = await refreshGoogleAccessToken(creds, row.refreshToken);
  await prisma.googleOAuthToken.update({
    where: { userId },
    data: {
      accessToken: refreshed.accessToken,
      expiresAt: refreshed.expiresAt,
      scope: refreshed.scope,
    },
  });
  return refreshed.accessToken;
}

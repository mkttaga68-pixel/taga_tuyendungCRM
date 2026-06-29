import { createHmac, timingSafeEqual } from "crypto";
import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  buildGoogleAuthUrl,
  exchangeGoogleAuthCode,
  fetchGoogleUserEmail,
  refreshGoogleAccessToken,
  type GoogleIntegrationStatusDto,
  type GoogleOAuthCredentials,
} from "@taga-crm/shared";
import { PrismaService } from "../../prisma/prisma.service";

const STATE_MAX_AGE_MS = 10 * 60 * 1000;
/** Refresh sớm 60s trước khi hết hạn thật để tránh race condition lúc gọi Calendar API. */
const TOKEN_REFRESH_SKEW_MS = 60 * 1000;

@Injectable()
export class GoogleTokenService {
  private readonly logger = new Logger(GoogleTokenService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private getCredentials(): GoogleOAuthCredentials {
    const clientId = this.configService.get<string>("GOOGLE_OAUTH_CLIENT_ID");
    const clientSecret = this.configService.get<string>("GOOGLE_OAUTH_CLIENT_SECRET");
    const redirectUri = this.configService.get<string>("GOOGLE_OAUTH_REDIRECT_URI");
    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException(
        "Google OAuth chưa được cấu hình (thiếu GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI trong .env)",
      );
    }
    return { clientId, clientSecret, redirectUri };
  }

  private getStateSecret(): string {
    return this.configService.getOrThrow<string>("JWT_ACCESS_SECRET");
  }

  private signState(userId: string): string {
    const payload = `${userId}.${Date.now()}`;
    const signature = createHmac("sha256", this.getStateSecret()).update(payload).digest("hex");
    return Buffer.from(`${payload}.${signature}`).toString("base64url");
  }

  private verifyState(state: string): string {
    let decoded: string;
    try {
      decoded = Buffer.from(state, "base64url").toString("utf8");
    } catch {
      throw new UnauthorizedException("State OAuth không hợp lệ");
    }
    const parts = decoded.split(".");
    if (parts.length !== 3) {
      throw new UnauthorizedException("State OAuth không hợp lệ");
    }
    const [userId, timestampRaw, signature] = parts as [string, string, string];
    const payload = `${userId}.${timestampRaw}`;
    const expectedSignature = createHmac("sha256", this.getStateSecret())
      .update(payload)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedSignature, "hex");
    const actualBuf = Buffer.from(signature, "hex");
    if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
      throw new UnauthorizedException("State OAuth không khớp chữ ký");
    }

    const timestamp = Number(timestampRaw);
    if (!Number.isFinite(timestamp) || Date.now() - timestamp > STATE_MAX_AGE_MS) {
      throw new UnauthorizedException("State OAuth đã hết hạn, vui lòng kết nối lại");
    }
    return userId;
  }

  buildAuthUrl(userId: string): string {
    const creds = this.getCredentials();
    const state = this.signState(userId);
    return buildGoogleAuthUrl(creds, state);
  }

  /** Gọi từ callback công khai (Google redirect, không có Authorization header) — userId lấy từ state đã ký. */
  async handleCallback(code: string, state: string): Promise<void> {
    const userId = this.verifyState(state);
    const creds = this.getCredentials();
    const tokenResult = await exchangeGoogleAuthCode(creds, code);
    const googleEmail = await fetchGoogleUserEmail(tokenResult.accessToken);

    await this.prisma.googleOAuthToken.upsert({
      where: { userId },
      create: {
        userId,
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        expiresAt: tokenResult.expiresAt,
        scope: tokenResult.scope,
        googleEmail,
      },
      update: {
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        expiresAt: tokenResult.expiresAt,
        scope: tokenResult.scope,
        googleEmail,
      },
    });
  }

  async getStatus(userId: string): Promise<GoogleIntegrationStatusDto> {
    const row = await this.prisma.googleOAuthToken.findUnique({ where: { userId } });
    return { connected: !!row, googleEmail: row?.googleEmail ?? null };
  }

  async disconnect(userId: string): Promise<void> {
    await this.prisma.googleOAuthToken.deleteMany({ where: { userId } });
  }

  /** Trả access token còn hiệu lực cho user — tự refresh nếu sắp hết hạn, lưu lại DB. */
  async getValidAccessToken(userId: string): Promise<string> {
    const row = await this.prisma.googleOAuthToken.findUnique({ where: { userId } });
    if (!row) {
      throw new BadRequestException(
        "Người dùng chưa kết nối Google Calendar — vào Cài đặt > Tích hợp để kết nối trước",
      );
    }

    if (row.expiresAt.getTime() - TOKEN_REFRESH_SKEW_MS > Date.now()) {
      return row.accessToken;
    }

    const creds = this.getCredentials();
    try {
      const refreshed = await refreshGoogleAccessToken(creds, row.refreshToken);
      await this.prisma.googleOAuthToken.update({
        where: { userId },
        data: {
          accessToken: refreshed.accessToken,
          expiresAt: refreshed.expiresAt,
          scope: refreshed.scope,
        },
      });
      return refreshed.accessToken;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định";
      this.logger.warn(`Refresh Google access token thất bại cho user ${userId}: ${message}`);
      throw new BadRequestException(
        `Không thể làm mới quyền truy cập Google (${message}) — vui lòng kết nối lại Google Calendar`,
      );
    }
  }
}

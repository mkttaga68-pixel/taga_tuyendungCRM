import { Controller, Get, Logger, Post, Query, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import type { AccessTokenPayload } from "@taga-crm/shared";
import { GoogleTokenService } from "./google-token.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@Controller("integrations/google")
export class GoogleIntegrationController {
  private readonly logger = new Logger(GoogleIntegrationController.name);

  constructor(
    private readonly tokenService: GoogleTokenService,
    private readonly configService: ConfigService,
  ) {}

  @Get("status")
  @UseGuards(JwtAuthGuard)
  status(@CurrentUser() user: AccessTokenPayload) {
    return this.tokenService.getStatus(user.sub);
  }

  @Get("auth-url")
  @UseGuards(JwtAuthGuard)
  authUrl(@CurrentUser() user: AccessTokenPayload) {
    return { url: this.tokenService.buildAuthUrl(user.sub) };
  }

  /**
   * Google redirect thẳng trình duyệt về đây (không có Authorization header)
   * — userId được xác định qua "state" đã ký HMAC ở bước /auth-url, không
   * qua JwtAuthGuard. Luôn redirect về frontend (không trả JSON) vì đây là
   * điểm cuối của 1 lần chuyển hướng trình duyệt, không phải gọi API XHR.
   */
  @Get("callback")
  async callback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Query("error") error: string | undefined,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>("CORS_ORIGIN") ?? "http://localhost:3000";
    const settingsUrl = `${frontendUrl}/settings`;

    if (error) {
      return res.redirect(`${settingsUrl}?google=denied`);
    }
    if (!code || !state) {
      return res.redirect(`${settingsUrl}?google=error`);
    }

    try {
      await this.tokenService.handleCallback(code, state);
      return res.redirect(`${settingsUrl}?google=connected`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định";
      this.logger.warn(`Google OAuth callback thất bại: ${message}`);
      return res.redirect(`${settingsUrl}?google=error`);
    }
  }

  @Post("disconnect")
  @UseGuards(JwtAuthGuard)
  async disconnect(@CurrentUser() user: AccessTokenPayload) {
    await this.tokenService.disconnect(user.sub);
    return { success: true };
  }
}

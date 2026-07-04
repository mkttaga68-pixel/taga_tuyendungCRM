import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import {
  changePasswordSchema,
  loginSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type UpdateProfileInput,
} from "@taga-crm/shared";
import { AuthService } from "./auth.service";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AccessTokenPayload } from "@taga-crm/shared";

const REFRESH_COOKIE_NAME = "refresh_token";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: { email: string; password: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { tokens } = await this.authService.login(body, {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });

    this.setRefreshCookie(res, tokens.refreshToken, tokens.refreshTokenMaxAgeMs);
    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    if (!rawRefreshToken) {
      throw new UnauthorizedException("Không tìm thấy refresh token");
    }

    const tokens = await this.authService.refresh(rawRefreshToken, {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });

    this.setRefreshCookie(res, tokens.refreshToken, tokens.refreshTokenMaxAgeMs);
    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    if (rawRefreshToken) {
      await this.authService.logout(rawRefreshToken);
    }
    const isProduction = this.configService.get("NODE_ENV") === "production";
    res.clearCookie(REFRESH_COOKIE_NAME, {
      path: "/auth",
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    });
    return { success: true };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AccessTokenPayload) {
    return this.authService.getProfile(user.sub);
  }

  @Patch("profile")
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileInput,
  ) {
    return this.authService.updateProfile(user.sub, body);
  }

  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordInput,
  ) {
    await this.authService.changePassword(user.sub, body);
    return { success: true };
  }

  private setRefreshCookie(res: Response, token: string, maxAgeMs: number) {
    const isProduction = this.configService.get("NODE_ENV") === "production";
    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      // SameSite: none cho phép gửi cookie trong POST cross-site (cần thiết khi
      // web và API deploy trên 2 subdomain khác nhau, ví dụ Railway). Chỉ dùng
      // none trong production vì none bắt buộc kèm Secure: true (HTTPS).
      sameSite: isProduction ? "none" : "lax",
      path: "/auth",
      maxAge: maxAgeMs,
    });
  }
}

import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import type {
  AuthTokensResponse,
  ChangePasswordInput,
  LoginInput,
  UpdateProfileInput,
} from "@taga-crm/shared";
import { PrismaService } from "../prisma/prisma.service";
import { parseDurationToMs } from "../common/utils/duration.util";
import { generateOpaqueToken, sha256Hex } from "../common/utils/hash.util";

export interface RequestMeta {
  userAgent?: string;
  ip?: string;
}

export interface IssuedTokens extends AuthTokensResponse {
  refreshTokenMaxAgeMs: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    input: LoginInput,
    meta: RequestMeta,
  ): Promise<{ tokens: IssuedTokens; userId: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });

    if (!user || user.deletedAt || !user.isActive) {
      throw new UnauthorizedException("Email hoặc mật khẩu không đúng");
    }

    const passwordValid = await argon2.verify(user.passwordHash, input.password);
    if (!passwordValid) {
      throw new UnauthorizedException("Email hoặc mật khẩu không đúng");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(
      { id: user.id, email: user.email, role: user.role },
      meta,
    );
    return { tokens, userId: user.id };
  }

  async refresh(rawRefreshToken: string, meta: RequestMeta): Promise<IssuedTokens> {
    const tokenHash = sha256Hex(rawRefreshToken);
    const existing = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    if (!existing || existing.user.deletedAt || !existing.user.isActive) {
      throw new UnauthorizedException("Refresh token không hợp lệ hoặc đã hết hạn");
    }

    // Rotation: thu hồi token cũ trước khi cấp token mới — chống replay.
    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(
      { id: existing.user.id, email: existing.user.email, role: existing.user.role },
      meta,
    );
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = sha256Hex(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException("Tài khoản không còn hoạt động");
    }
    const { passwordHash: _passwordHash, ...profile } = user;
    return profile;
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { fullName: input.fullName, phone: input.phone },
    });
    const { passwordHash: _passwordHash, ...profile } = user;
    return profile;
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException("Tài khoản không còn hoạt động");
    }

    const passwordValid = await argon2.verify(user.passwordHash, input.currentPassword);
    if (!passwordValid) {
      throw new BadRequestException("Mật khẩu hiện tại không đúng");
    }

    const passwordHash = await argon2.hash(input.newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    // Đổi mật khẩu xong thì thu hồi mọi refresh token cũ — bắt đăng nhập lại trên các thiết bị khác.
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(
    user: { id: string; email: string; role: string },
    meta: RequestMeta,
  ): Promise<IssuedTokens> {
    const accessExpiresIn = this.configService.getOrThrow<string>("JWT_ACCESS_EXPIRES_IN");
    const refreshExpiresIn = this.configService.getOrThrow<string>("JWT_REFRESH_EXPIRES_IN");

    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
        expiresIn: accessExpiresIn,
      },
    );

    const refreshTokenRaw = generateOpaqueToken();
    const refreshTokenMaxAgeMs = parseDurationToMs(refreshExpiresIn);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256Hex(refreshTokenRaw),
        expiresAt: new Date(Date.now() + refreshTokenMaxAgeMs),
        userAgent: meta.userAgent,
        ip: meta.ip,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenRaw,
      expiresIn: Math.floor(parseDurationToMs(accessExpiresIn) / 1000),
      refreshTokenMaxAgeMs,
    };
  }
}

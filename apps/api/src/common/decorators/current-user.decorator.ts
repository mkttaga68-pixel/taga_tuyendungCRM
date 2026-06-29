import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { AccessTokenPayload } from "@taga-crm/shared";

/** Lấy payload user đã xác thực (gắn vào request bởi JwtStrategy) trong route handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessTokenPayload => {
    const request = ctx.switchToHttp().getRequest<Request & { user: AccessTokenPayload }>();
    return request.user;
  },
);

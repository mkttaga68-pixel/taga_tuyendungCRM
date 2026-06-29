import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { Role, AccessTokenPayload } from "@taga-crm/shared";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AccessTokenPayload }>();
    const user = request.user;
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException("Bạn không có quyền truy cập tài nguyên này");
    }

    return true;
  }
}

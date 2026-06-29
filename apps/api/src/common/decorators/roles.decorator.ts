import { SetMetadata } from "@nestjs/common";
import type { Role } from "@taga-crm/shared";

export const ROLES_KEY = "roles";

/** Đánh dấu route chỉ cho phép các Role được liệt kê truy cập (dùng cùng RolesGuard). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

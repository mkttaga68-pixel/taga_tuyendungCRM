import { z } from "zod";
import { ROLES } from "../enums/role.enum";

/**
 * Hệ thống nội bộ, không có public self-register — tài khoản chỉ được
 * Admin tạo trong module "Người dùng & Phân quyền".
 */
export const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
  fullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự"),
  role: z.enum(ROLES),
  phone: z.string().optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const updateUserSchema = z.object({
  fullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự").optional(),
  role: z.enum(ROLES).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự").optional(),
  phone: z.string().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
  newPassword: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  role: (typeof ROLES)[number];
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
  role: (typeof ROLES)[number];
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

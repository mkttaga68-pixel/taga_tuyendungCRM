import { apiRequest } from "./api-client";
import { useAuthStore, type AuthUser } from "@/stores/auth-store";
import type { ChangePasswordInput, LoginInput, UpdateProfileInput } from "@taga-crm/shared";

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
}

export function login(input: LoginInput) {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
    skipAuth: true,
  });
}

export function fetchMe() {
  return apiRequest<AuthUser>("/auth/me");
}

/**
 * Dùng khi mount app lần đầu (reload trang) — lúc này access token trong memory
 * đã mất. Refresh trước bằng cookie httpOnly để tránh chắc chắn bị 401 nếu gọi
 * /auth/me ngay khi chưa có token (apiRequest vẫn tự retry được, nhưng gọi
 * refresh trước giúp tránh 1 request lỗi không cần thiết mỗi lần reload).
 */
export async function bootstrapSession() {
  if (!useAuthStore.getState().accessToken) {
    try {
      const tokens = await apiRequest<LoginResponse>("/auth/refresh", {
        method: "POST",
        skipAuth: true,
      });
      useAuthStore.getState().setAccessToken(tokens.accessToken);
    } catch {
      // Không có refresh cookie hợp lệ — fetchMe() dưới đây sẽ 401 và AuthGuard
      // điều hướng về /login.
    }
  }
  return fetchMe();
}

export function logout() {
  return apiRequest<{ success: boolean }>("/auth/logout", { method: "POST" });
}

export function updateProfile(input: UpdateProfileInput) {
  return apiRequest<AuthUser>("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function changePassword(input: ChangePasswordInput) {
  return apiRequest<{ success: true }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

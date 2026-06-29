import { create } from "zustand";
import type { Role } from "@taga-crm/shared";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  avatarUrl?: string | null;
  phone?: string | null;
}

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  status: AuthStatus;
  setSession: (accessToken: string, user: AuthUser) => void;
  setAccessToken: (accessToken: string | null) => void;
  setStatus: (status: AuthStatus) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  clear: () => void;
}

/**
 * Access token chỉ giữ trong memory (không localStorage) để giảm rủi ro XSS đọc token
 * lâu dài — refresh token nằm trong httpOnly cookie do API set, không tồn tại ở đây.
 * Sau khi reload trang, AuthGuard sẽ gọi /auth/refresh để lấy access token mới.
 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: "idle",
  setSession: (accessToken, user) => set({ accessToken, user, status: "authenticated" }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setStatus: (status) => set({ status }),
  updateUser: (patch) => set((s) => ({ user: s.user ? { ...s.user, ...patch } : s.user })),
  clear: () => set({ accessToken: null, user: null, status: "unauthenticated" }),
}));

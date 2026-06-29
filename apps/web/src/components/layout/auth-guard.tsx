"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { bootstrapSession } from "@/lib/auth-api";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Bảo vệ route trong (app): nếu chưa có access token (vd: vừa reload trang),
 * bootstrapSession() tự refresh bằng cookie httpOnly trước khi gọi /auth/me.
 * Chỉ khi refresh cũng thất bại mới điều hướng về /login.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const setSession = useAuthStore((s) => s.setSession);
  const setStatus = useAuthStore((s) => s.setStatus);

  const { data, error } = useQuery({
    queryKey: ["me"],
    queryFn: bootstrapSession,
    retry: false,
    enabled: status !== "authenticated",
  });

  useEffect(() => {
    if (status === "authenticated") return;

    if (data) {
      const currentAccessToken = useAuthStore.getState().accessToken ?? "";
      setSession(currentAccessToken, data);
    } else if (error) {
      setStatus("unauthenticated");
      router.replace("/login");
    }
  }, [data, error, status, setSession, setStatus, router]);

  if (status !== "authenticated") {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Đang kiểm tra đăng nhập...
      </div>
    );
  }

  return <>{children}</>;
}

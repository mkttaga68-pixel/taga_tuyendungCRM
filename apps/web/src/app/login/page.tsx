"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@taga-crm/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { login, fetchMe } from "@/lib/auth-api";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setSubmitting(true);
    try {
      const { accessToken } = await login(values);
      setAccessToken(accessToken);
      const user = await fetchMe();
      setSession(accessToken, user);
      router.push("/dashboard");
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Không thể đăng nhập, vui lòng thử lại";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Đăng nhập</CardTitle>
          <CardDescription>CRM Tuyển Dụng Taga — tài khoản nội bộ</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="ten@taga.vn"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

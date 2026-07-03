"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, KeyRound, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  disconnectGoogleIntegration,
  getGoogleAuthUrl,
  getGoogleIntegrationStatus,
} from "@/lib/google-integration-api";
import { changePassword, updateProfile } from "@/lib/auth-api";
import {
  getEmailSettingsStatus,
  saveEmailSettings,
  sendTestEmail,
} from "@/lib/email-settings-api";
import { ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

function GoogleIntegrationCard() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    queryKey: ["integrations", "google", "status"],
    queryFn: getGoogleIntegrationStatus,
  });

  useEffect(() => {
    const result = searchParams.get("google");
    if (!result) return;
    if (result === "connected") {
      toast.success("Đã kết nối Google Calendar");
    } else if (result === "denied") {
      toast.error("Bạn đã từ chối cấp quyền truy cập Google");
    } else if (result === "error") {
      toast.error("Kết nối Google thất bại, vui lòng thử lại");
    }
    queryClient.invalidateQueries({ queryKey: ["integrations", "google", "status"] });
    window.history.replaceState(null, "", "/settings");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectMutation = useMutation({
    mutationFn: getGoogleAuthUrl,
    onSuccess: (result) => {
      window.location.href = result.url;
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể bắt đầu kết nối Google");
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectGoogleIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", "google", "status"] });
      toast.success("Đã ngắt kết nối Google Calendar");
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể ngắt kết nối");
    },
  });

  const status = statusQuery.data;

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="size-4" /> Google Calendar / Meet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Kết nối tài khoản Google cá nhân để hệ thống có thể tự tạo Google Calendar event kèm link
          Meet khi đặt lịch phỏng vấn (tab &quot;Phỏng vấn&quot; trong chi tiết ứng viên) hoặc khi
          Automation chạy node Google Calendar/Meet trên các ứng viên bạn là Recruiter.
        </p>

        {statusQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        ) : status?.connected ? (
          <div className="flex items-center gap-3">
            <Badge variant="secondary">Đã kết nối</Badge>
            {status.googleEmail && (
              <span className="text-sm text-muted-foreground">{status.googleEmail}</span>
            )}
          </div>
        ) : (
          <Badge variant="outline">Chưa kết nối</Badge>
        )}

        {status?.connected ? (
          <Button
            variant="outline"
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
          >
            {disconnectMutation.isPending ? "Đang ngắt kết nối..." : "Ngắt kết nối"}
          </Button>
        ) : (
          <Button onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending}>
            {connectMutation.isPending ? "Đang chuyển hướng..." : "Kết nối Google"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ProfileCard() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  const mutation = useMutation({
    mutationFn: () => updateProfile({ fullName, phone }),
    onSuccess: (profile) => {
      updateUser({ fullName: profile.fullName, phone: profile.phone });
      toast.success("Đã lưu hồ sơ cá nhân");
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể lưu hồ sơ");
    },
  });

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserRound className="size-4" /> Hồ sơ cá nhân
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="profile-email">Email</Label>
          <Input id="profile-email" value={user?.email ?? ""} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-fullname">Họ tên</Label>
          <Input
            id="profile-fullname"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-phone">Số điện thoại</Label>
          <Input id="profile-phone" value={phone ?? ""} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </CardContent>
    </Card>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () => changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      toast.success("Đã đổi mật khẩu");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể đổi mật khẩu");
    },
  });

  function handleSubmit() {
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu mới nhập lại không khớp");
      return;
    }
    mutation.mutate();
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4" /> Đổi mật khẩu
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="pw-current">Mật khẩu hiện tại</Label>
          <Input
            id="pw-current"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw-new">Mật khẩu mới</Label>
          <Input
            id="pw-new"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw-confirm">Nhập lại mật khẩu mới</Label>
          <Input
            id="pw-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <Button onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? "Đang đổi..." : "Đổi mật khẩu"}
        </Button>
      </CardContent>
    </Card>
  );
}

function EmailSettingsCard() {
  const queryClient = useQueryClient();
  const statusQuery = useQuery({
    queryKey: ["settings", "email", "status"],
    queryFn: getEmailSettingsStatus,
  });

  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (statusQuery.data) {
      setFromEmail(statusQuery.data.fromEmail);
      setFromName(statusQuery.data.fromName);
    }
  }, [statusQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => saveEmailSettings({ apiKey, fromEmail, fromName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "email", "status"] });
      setApiKey("");
      setShowKey(false);
      toast.success("Đã lưu cấu hình email");
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể lưu cấu hình");
    },
  });

  const testMutation = useMutation({
    mutationFn: sendTestEmail,
    onSuccess: (r) => toast.success(`Đã gửi email thử đến ${r.sentTo}`),
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Gửi thử thất bại");
    },
  });

  const status = statusQuery.data;
  const canSave = apiKey.trim().length > 0 && fromEmail.trim().length > 0 && fromName.trim().length > 0;

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="size-4" /> Kết nối Email (Resend)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Cấu hình Resend để hệ thống có thể gửi email tự động (Automation, thông báo ứng viên...).
          Lấy API key tại{" "}
          <a
            href="https://resend.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            resend.com/api-keys
          </a>
          .
        </p>

        {statusQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        ) : status?.configured ? (
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">API key hiện tại: </span>
            <span className="font-mono">{status.maskedKey}</span>
          </div>
        ) : (
          <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-400">
            Chưa cấu hình — email chưa hoạt động
          </div>
        )}

        <div className="space-y-3 border-t pt-3">
          <p className="text-sm font-medium">
            {status?.configured ? "Cập nhật cấu hình" : "Thiết lập Resend"}
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="resend-api-key">Resend API Key</Label>
            <div className="flex gap-2">
              <Input
                id="resend-api-key"
                type={showKey ? "text" : "password"}
                placeholder="re_xxxxxxxxxxxx"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono"
              />
              <Button variant="outline" size="sm" onClick={() => setShowKey((v) => !v)} className="shrink-0">
                {showKey ? "Ẩn" : "Hiện"}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="resend-from-name">Tên người gửi</Label>
            <Input
              id="resend-from-name"
              placeholder="TAGA Tuyển Dụng"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="resend-from-email">Email gửi đi</Label>
            <Input
              id="resend-from-email"
              type="email"
              placeholder="tuyen-dung@yourdomain.com"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Domain phải được verify trên Resend. Trong giai đoạn test dùng{" "}
              <span className="font-mono">onboarding@resend.dev</span> (Resend cung cấp sẵn).
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !canSave}>
              {saveMutation.isPending ? "Đang lưu..." : "Lưu cấu hình"}
            </Button>
            {status?.configured && (
              <Button
                variant="outline"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending}
              >
                {testMutation.isPending ? "Đang gửi..." : "Gửi email thử"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="h-full space-y-4 overflow-auto p-6">
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-xl font-semibold">Cài đặt</h1>
        <span className="text-sm text-muted-foreground">Hồ sơ cá nhân & tích hợp tài khoản</span>
      </div>
      <ProfileCard />
      <ChangePasswordCard />
      <EmailSettingsCard />
      <Suspense>
        <GoogleIntegrationCard />
      </Suspense>
    </div>
  );
}

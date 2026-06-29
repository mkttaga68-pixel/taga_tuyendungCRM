"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, KeyRound, UserRound } from "lucide-react";
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

export default function SettingsPage() {
  return (
    <div className="h-full space-y-4 overflow-auto p-6">
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-xl font-semibold">Cài đặt</h1>
        <span className="text-sm text-muted-foreground">Hồ sơ cá nhân & tích hợp tài khoản</span>
      </div>
      <ProfileCard />
      <ChangePasswordCard />
      <Suspense>
        <GoogleIntegrationCard />
      </Suspense>
    </div>
  );
}

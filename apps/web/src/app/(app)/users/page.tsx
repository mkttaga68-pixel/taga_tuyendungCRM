"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  createUserSchema,
  ROLE_LABELS,
  ROLES,
  type CreateUserInput,
  type Role,
  type UserDto,
} from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createUser, deleteUser, listUsers, updateUser } from "@/lib/users-api";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError } from "@/lib/api-client";

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserDto | null>(null);

  const query = useQuery({ queryKey: ["users"], queryFn: listUsers });

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: "", password: "", fullName: "", role: "RECRUITER", phone: "" },
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(`Đã tạo tài khoản "${created.fullName}"`);
      setCreateOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể tạo người dùng");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => updateUser(id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Đã đổi vai trò");
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể đổi vai trò");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateUser(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Đã cập nhật trạng thái hoạt động");
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể cập nhật trạng thái");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Đã xoá người dùng");
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể xoá người dùng");
    },
  });

  if (currentUser && currentUser.role !== "ADMIN") {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Bạn không có quyền truy cập — chỉ Admin mới quản lý được người dùng và phân quyền.
      </div>
    );
  }

  return (
    <div className="h-full space-y-6 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Người dùng & Phân quyền</h1>
          <p className="text-muted-foreground">
            Tạo tài khoản, đổi vai trò và khoá/mở quyền truy cập cho từng người dùng.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>+ Thêm người dùng</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm người dùng</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-3"
              onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
            >
              <div className="space-y-2">
                <Label htmlFor="u-fullname">Họ tên</Label>
                <Input id="u-fullname" {...form.register("fullName")} />
                {form.formState.errors.fullName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.fullName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="u-email">Email</Label>
                <Input id="u-email" type="email" {...form.register("email")} />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="u-password">Mật khẩu</Label>
                <Input id="u-password" type="password" {...form.register("password")} />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="u-phone">Số điện thoại (tuỳ chọn)</Label>
                <Input id="u-phone" {...form.register("phone")} />
              </div>
              <div className="space-y-2">
                <Label>Vai trò</Label>
                <Select
                  value={form.watch("role") ?? "RECRUITER"}
                  onValueChange={(v) => form.setValue("role", v as Role)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Đang tạo..." : "Tạo"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Hoạt động</TableHead>
              <TableHead>Đăng nhập gần nhất</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(query.data ?? []).map((u) => {
              const isSelf = u.id === currentUser?.id;
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.fullName} {isSelf && <Badge variant="outline">Bạn</Badge>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Select
                      value={u.role}
                      disabled={isSelf || updateMutation.isPending}
                      onValueChange={(v) =>
                        updateMutation.mutate({ id: u.id, role: v as Role })
                      }
                    >
                      <SelectTrigger className="h-8 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={u.isActive}
                      disabled={isSelf || toggleActiveMutation.isPending}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: u.id, isActive: checked })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.lastLoginAt ? format(new Date(u.lastLoginAt), "dd/MM/yyyy HH:mm") : "Chưa đăng nhập"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSelf}
                      onClick={() => setDeleteTarget(u)}
                    >
                      Xoá
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {query.data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Chưa có người dùng nào.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(next) => !next && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá người dùng?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tài khoản &quot;{deleteTarget?.fullName}&quot; sẽ bị khoá truy cập và xoá khỏi danh sách
            (lịch sử thay đổi liên quan vẫn được giữ lại để đối chiếu Audit Log).
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Huỷ
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? "Đang xoá..." : "Xoá"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

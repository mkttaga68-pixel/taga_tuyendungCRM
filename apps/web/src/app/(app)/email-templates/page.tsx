"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { createEmailTemplateSchema } from "@taga-crm/shared";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createEmailTemplate,
  deleteEmailTemplate,
  listEmailTemplates,
} from "@/lib/email-templates-api";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError } from "@/lib/api-client";

export default function EmailTemplatesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === "ADMIN" || user?.role === "HR_MANAGER";
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const query = useQuery({ queryKey: ["email-templates"], queryFn: listEmailTemplates });

  const createDialogSchema = createEmailTemplateSchema.pick({ name: true });
  const form = useForm<z.infer<typeof createDialogSchema>>({
    resolver: zodResolver(createDialogSchema),
    defaultValues: { name: "" },
  });

  const createMutation = useMutation({
    mutationFn: (values: z.infer<typeof createDialogSchema>) =>
      createEmailTemplate({ ...values, subject: "", blocks: [] }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success(`Đã tạo mẫu "${created.name}"`);
      setOpen(false);
      form.reset();
      router.push(`/email-templates/${created.id}`);
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể tạo mẫu email");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEmailTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Đã xoá mẫu email");
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể xoá mẫu email");
    },
  });

  return (
    <div className="h-full space-y-6 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Email Template</h1>
          <p className="text-muted-foreground">
            Soạn mẫu email kéo-thả theo block, dùng trong node &quot;Email&quot; của Automation.
          </p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>+ Tạo mẫu email</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tạo mẫu email</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-3"
                onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
              >
                <div className="space-y-2">
                  <Label htmlFor="et-name">Tên mẫu</Label>
                  <Input id="et-name" placeholder="VD: Mời phỏng vấn vòng 1" {...form.register("name")} />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Đang tạo..." : "Tạo & mở builder"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên mẫu</TableHead>
              <TableHead>Chủ đề</TableHead>
              <TableHead>Số block</TableHead>
              <TableHead>Cập nhật gần nhất</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(query.data ?? []).map((tpl) => (
              <TableRow key={tpl.id} className="cursor-pointer" onClick={() => router.push(`/email-templates/${tpl.id}`)}>
                <TableCell className="font-medium">{tpl.name}</TableCell>
                <TableCell className="text-muted-foreground">{tpl.subject}</TableCell>
                <TableCell>{tpl.blocks.length}</TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(tpl.updatedAt), "dd/MM/yyyy HH:mm")}
                </TableCell>
                <TableCell className="text-right">
                  {canManage && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ id: tpl.id, name: tpl.name });
                      }}
                    >
                      Xoá
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {query.data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Chưa có mẫu email nào.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(next) => !next && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xoá mẫu email?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Mẫu &quot;{deleteTarget?.name}&quot; sẽ bị xoá. Các node Automation đang trỏ tới mẫu này
            sẽ báo lỗi khi chạy cho tới khi được cập nhật lại.
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

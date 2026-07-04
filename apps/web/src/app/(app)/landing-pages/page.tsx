"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createLandingPageSchema,
  LANDING_PAGE_STATUS_LABELS,
  type CreateLandingPageInput,
} from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createLandingPage, deleteLandingPage, listLandingPages } from "@/lib/landing-pages-api";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError } from "@/lib/api-client";

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  ACTIVE: "default",
  PAUSED: "secondary",
  ARCHIVED: "destructive",
};

const DIACRITIC_MARKS_REGEX = /[̀-ͯ]/g;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITIC_MARKS_REGEX, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function LandingPagesPage() {
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === "ADMIN" || user?.role === "HR_MANAGER";
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const query = useQuery({ queryKey: ["landing-pages"], queryFn: listLandingPages });

  const form = useForm<CreateLandingPageInput>({
    resolver: zodResolver(createLandingPageSchema),
    defaultValues: { name: "", slug: "", url: "", domain: "", description: "", status: "DRAFT" },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLandingPage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
      toast.success(`Đã xóa Landing Page "${deleteTarget?.name}"`);
      setDeleteTarget(null);
    },
    onError: () => toast.error("Không thể xóa Landing Page"),
  });

  const createMutation = useMutation({
    mutationFn: createLandingPage,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
      setCreatedApiKey(created.apiKey);
      toast.success(`Đã tạo Landing Page "${created.name}"`);
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể tạo Landing Page");
    },
  });

  function closeDialog() {
    setOpen(false);
    setCreatedApiKey(null);
    setSlugTouched(false);
    form.reset();
  }

  return (
    <div className="h-full space-y-6 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Landing Page</h1>
          <p className="text-muted-foreground">
            Quản lý các trang đích nhận form ứng tuyển — mỗi trang có API key riêng, form schema
            versioned và lịch sử submission đầy đủ.
          </p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeDialog())}>
            <DialogTrigger asChild>
              <Button>+ Tạo Landing Page</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{createdApiKey ? "Đã tạo Landing Page" : "Tạo Landing Page"}</DialogTitle>
              </DialogHeader>

              {createdApiKey ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Lưu lại API key dưới đây ngay — sẽ không hiển thị lại lần nào nữa. Dùng key này
                    khi gắn vào landing page thật (query param <code>?key=</code> trên URL submit).
                  </p>
                  <div className="rounded-md border bg-muted p-3 font-mono text-xs break-all">
                    {createdApiKey}
                  </div>
                  <DialogFooter>
                    <Button onClick={closeDialog}>Đã lưu, đóng lại</Button>
                  </DialogFooter>
                </div>
              ) : (
                <form
                  className="space-y-3"
                  onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
                >
                  <div className="space-y-2">
                    <Label htmlFor="lp-name">Tên</Label>
                    <Input
                      id="lp-name"
                      {...form.register("name", {
                        onChange: (e) => {
                          if (!slugTouched) form.setValue("slug", slugify(e.target.value));
                        },
                      })}
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lp-slug">Slug (dùng trong URL Ingestion API)</Label>
                    <Input
                      id="lp-slug"
                      {...form.register("slug", { onChange: () => setSlugTouched(true) })}
                    />
                    {form.formState.errors.slug && (
                      <p className="text-sm text-destructive">{form.formState.errors.slug.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lp-url">URL trang đích</Label>
                    <Input id="lp-url" placeholder="https://..." {...form.register("url")} />
                    {form.formState.errors.url && (
                      <p className="text-sm text-destructive">{form.formState.errors.url.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lp-domain">Domain (tuỳ chọn)</Label>
                    <Input id="lp-domain" {...form.register("domain")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Trạng thái</Label>
                    <Select
                      value={form.watch("status") ?? "DRAFT"}
                      onValueChange={(v) =>
                        form.setValue("status", v as CreateLandingPageInput["status"])
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LANDING_PAGE_STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
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
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Submissions</TableHead>
              <TableHead className="text-right">Ứng viên</TableHead>
              <TableHead>Người tạo</TableHead>
              {canManage && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(query.data ?? []).map((lp) => (
              <TableRow key={lp.id}>
                <TableCell>
                  <Link href={`/landing-pages/${lp.id}`} className="font-medium hover:underline">
                    {lp.name}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{lp.slug}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE_VARIANT[lp.status]}>
                    {LANDING_PAGE_STATUS_LABELS[lp.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{lp.submissionCount}</TableCell>
                <TableCell className="text-right">{lp.candidateCount}</TableCell>
                <TableCell className="text-muted-foreground">{lp.creator?.fullName ?? "—"}</TableCell>
                {canManage && (
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget({ id: lp.id, name: lp.name })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {query.data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={canManage ? 7 : 6} className="py-8 text-center text-muted-foreground">
                  Chưa có Landing Page nào.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa Landing Page?</AlertDialogTitle>
            <AlertDialogDescription>
              Landing Page <strong>&quot;{deleteTarget?.name}&quot;</strong> sẽ bị xóa. Dữ liệu
              submissions và ứng viên liên quan vẫn được giữ lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

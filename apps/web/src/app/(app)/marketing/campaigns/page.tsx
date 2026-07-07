"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, Play, Pause, Trash2, ExternalLink } from "lucide-react";
import {
  listMktCampaigns,
  createMktCampaign,
  deleteMktCampaign,
  activateMktCampaign,
  pauseMktCampaign,
} from "@/lib/mkt-api";
import type { CreateMktCampaignInput, MktCampaignDto } from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nháp",
  ACTIVE: "Đang chạy",
  PAUSED: "Tạm dừng",
  ARCHIVED: "Lưu trữ",
};
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  ACTIVE: "default",
  PAUSED: "outline",
  ARCHIVED: "destructive",
};

function CreateCampaignDialog({
  open,
  onClose,
  onSave,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (v: CreateMktCampaignInput) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<CreateMktCampaignInput>({
    name: "",
    fromName: "",
    fromEmail: "",
  });
  const set = (k: keyof CreateMktCampaignInput, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo chiến dịch email</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tên chiến dịch *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="VD: Chào mừng khách mới tháng 7" />
          </div>
          <div>
            <Label>Mô tả</Label>
            <Input value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Mô tả ngắn..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tên người gửi *</Label>
              <Input value={form.fromName} onChange={(e) => set("fromName", e.target.value)} placeholder="Taga Group" />
            </div>
            <div>
              <Label>Email gửi *</Label>
              <Input type="email" value={form.fromEmail} onChange={(e) => set("fromEmail", e.target.value)} placeholder="marketing@taga.vn" />
            </div>
          </div>
          <div>
            <Label>Reply-To (tùy chọn)</Label>
            <Input type="email" value={form.replyTo ?? ""} onChange={(e) => set("replyTo", e.target.value)} placeholder="reply@taga.vn" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Hủy</Button>
          <Button
            disabled={!form.name.trim() || !form.fromName.trim() || !form.fromEmail.trim() || loading}
            onClick={() => onSave(form)}
          >
            {loading ? "Đang tạo..." : "Tạo chiến dịch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MktCampaignDto | null>(null);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["mkt-campaigns"],
    queryFn: listMktCampaigns,
  });

  const createMutation = useMutation({
    mutationFn: createMktCampaign,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-campaigns"] }); setCreateOpen(false); toast.success("Đã tạo chiến dịch"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const activateMutation = useMutation({
    mutationFn: activateMktCampaign,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-campaigns"] }); toast.success("Chiến dịch đã kích hoạt"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const pauseMutation = useMutation({
    mutationFn: pauseMktCampaign,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-campaigns"] }); toast.success("Đã tạm dừng chiến dịch"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMktCampaign,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-campaigns"] }); setDeleteTarget(null); toast.success("Đã xóa chiến dịch"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="h-full overflow-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chiến dịch Email</h1>
          <p className="text-sm text-muted-foreground">Quản lý chuỗi email marketing tự động</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Tạo chiến dịch
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên chiến dịch</TableHead>
              <TableHead>Người gửi</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Emails</TableHead>
              <TableHead className="text-right">Enrollments</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}><div className="h-4 rounded bg-muted animate-pulse" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Chưa có chiến dịch nào. Tạo chiến dịch đầu tiên để bắt đầu.
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{c.name}</p>
                      {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{c.fromName}</p>
                      <p className="text-muted-foreground text-xs">{c.fromEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[c.status] ?? "secondary"}>
                      {STATUS_LABELS[c.status] ?? c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{c.emailCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.enrollmentCount}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {c.status === "DRAFT" || c.status === "PAUSED" ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Kích hoạt"
                          onClick={() => activateMutation.mutate(c.id)}
                          disabled={activateMutation.isPending}
                        >
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      ) : c.status === "ACTIVE" ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Tạm dừng"
                          onClick={() => pauseMutation.mutate(c.id)}
                          disabled={pauseMutation.isPending}
                        >
                          <Pause className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                        <Link href={`/marketing/campaigns/${c.id}`}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(c)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateCampaignDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={(d) => createMutation.mutate(d)}
        loading={createMutation.isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa chiến dịch?</AlertDialogTitle>
            <AlertDialogDescription>
              Chiến dịch &quot;{deleteTarget?.name}&quot; và toàn bộ sequence email sẽ bị xóa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Tags, Pencil, Trash2 } from "lucide-react";
import { listMktTags, createMktTag, updateMktTag, deleteMktTag } from "@/lib/mkt-api";
import type { MktTagDto, CreateMktTagInput } from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";

const COLOR_OPTIONS = [
  "#8b5cf6", "#6366f1", "#3b82f6", "#06b6d4",
  "#22c55e", "#eab308", "#f97316", "#ef4444",
  "#ec4899", "#14b8a6", "#64748b", "#0f172a",
];

function TagFormDialog({
  open,
  onClose,
  initial,
  onSave,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  initial?: MktTagDto;
  onSave: (v: CreateMktTagInput) => void;
  loading: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? "#8b5cf6");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? "Sửa tag" : "Tạo tag mới"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tên tag *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Khách VIP" />
          </div>
          <div>
            <Label>Màu sắc</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`h-7 w-7 rounded-full border-2 transition-transform ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Xem trước:</span>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: color }}
            >
              {name || "Tag name"}
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Hủy</Button>
          <Button
            disabled={!name.trim() || loading}
            onClick={() => onSave({ name: name.trim(), color })}
          >
            {loading ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TagsPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MktTagDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MktTagDto | null>(null);

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ["mkt-tags"],
    queryFn: listMktTags,
  });

  const createMutation = useMutation({
    mutationFn: createMktTag,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-tags"] }); setCreateOpen(false); toast.success("Đã tạo tag"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateMktTagInput }) => updateMktTag(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-tags"] }); setEditTarget(null); toast.success("Đã cập nhật tag"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMktTag,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-tags"] }); setDeleteTarget(null); toast.success("Đã xóa tag"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="h-full overflow-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tags Marketing</h1>
          <p className="text-sm text-muted-foreground">Gán nhãn để phân loại và lọc contacts</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Tạo tag
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-8 w-24 rounded-full bg-muted animate-pulse" />
          ))}
        </div>
      ) : tags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Tags className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Chưa có tag nào. Tạo tag để phân loại contacts.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Tag</th>
                <th className="text-left px-4 py-2 font-medium">Slug</th>
                <th className="text-right px-4 py-2 font-medium">Số contacts</th>
                <th className="text-right px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr key={tag.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground font-mono text-xs">{tag.slug}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{tag.contactCount}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditTarget(tag)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(tag)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TagFormDialog open={createOpen} onClose={() => setCreateOpen(false)} onSave={(d) => createMutation.mutate(d)} loading={createMutation.isPending} />
      {editTarget && (
        <TagFormDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          initial={editTarget}
          onSave={(d) => updateMutation.mutate({ id: editTarget.id, data: d })}
          loading={updateMutation.isPending}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tag?</AlertDialogTitle>
            <AlertDialogDescription>
              Tag &quot;{deleteTarget?.name}&quot; sẽ bị xóa khỏi tất cả contacts.
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

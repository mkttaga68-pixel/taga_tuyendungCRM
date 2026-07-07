"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import {
  listMktContactLists,
  createMktContactList,
  updateMktContactList,
  deleteMktContactList,
} from "@/lib/mkt-api";
import type { MktContactListDto, CreateMktContactListInput } from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#64748b", "#1e293b",
];

function ListFormDialog({
  open,
  onClose,
  initial,
  onSave,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  initial?: MktContactListDto;
  onSave: (v: CreateMktContactListInput) => void;
  loading: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [color, setColor] = useState(initial?.color ?? "#6366f1");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Sửa danh sách" : "Tạo danh sách mới"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tên danh sách *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Khách hàng Detox" />
          </div>
          <div>
            <Label>Mô tả</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn về danh sách này..."
              rows={2}
            />
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Hủy</Button>
          <Button
            disabled={!name.trim() || loading}
            onClick={() => onSave({ name: name.trim(), description: description || undefined, color })}
          >
            {loading ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ContactListsPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MktContactListDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MktContactListDto | null>(null);

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ["mkt-contact-lists"],
    queryFn: listMktContactLists,
  });

  const createMutation = useMutation({
    mutationFn: createMktContactList,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mkt-contact-lists"] });
      setCreateOpen(false);
      toast.success("Đã tạo danh sách");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateMktContactListInput }) =>
      updateMktContactList(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mkt-contact-lists"] });
      setEditTarget(null);
      toast.success("Đã cập nhật danh sách");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMktContactList,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mkt-contact-lists"] });
      setDeleteTarget(null);
      toast.success("Đã xóa danh sách");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="h-full overflow-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Danh sách Contact</h1>
          <p className="text-sm text-muted-foreground">Phân nhóm contact theo mục đích marketing</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Tạo danh sách
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lg border bg-muted animate-pulse" />
          ))}
        </div>
      ) : lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Chưa có danh sách nào. Tạo danh sách đầu tiên để bắt đầu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <div key={list.id} className="rounded-lg border bg-card p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: list.color }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{list.name}</h3>
                  {list.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{list.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {list.memberCount.toLocaleString()} contacts
                </span>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setEditTarget(list)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(list)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ListFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={(data) => createMutation.mutate(data)}
        loading={createMutation.isPending}
      />

      {editTarget && (
        <ListFormDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          initial={editTarget}
          onSave={(data) => updateMutation.mutate({ id: editTarget.id, data })}
          loading={updateMutation.isPending}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa danh sách?</AlertDialogTitle>
            <AlertDialogDescription>
              Danh sách &quot;{deleteTarget?.name}&quot; sẽ bị xóa. Contacts trong danh sách sẽ không bị xóa.
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

"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Plus, Search, Trash2, ExternalLink, Pencil, UserPlus,
  FileUp, Plug, ClipboardList, MoreHorizontal, Users, Tag,
  ChevronRight,
} from "lucide-react";
import {
  listMktContactLists,
  createMktContactList,
  updateMktContactList,
  deleteMktContactList,
  listMktContacts,
  createMktContact,
  deleteMktContact,
  listMktTags,
  createMktTag,
  updateMktTag,
  deleteMktTag,
} from "@/lib/mkt-api";
import type {
  MktContactListDto,
  CreateMktContactListInput,
  MktContactDto,
  CreateMktContactInput,
  MktTagDto,
  CreateMktTagInput,
} from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab =
  | "danh-ba"
  | "tim-kiem"
  | "phan-khuc"
  | "bao-cao"
  | "don-dep"
  | "danh-sach-chan"
  | "truong-tuy-chinh"
  | "nhap-thong-ke"
  | "the";

const TABS: { id: Tab; label: string }[] = [
  { id: "danh-ba", label: "Danh bạ" },
  { id: "tim-kiem", label: "Tìm kiếm" },
  { id: "phan-khuc", label: "Phân khúc" },
  { id: "bao-cao", label: "Báo cáo" },
  { id: "don-dep", label: "Dọn dẹp danh bạ" },
  { id: "danh-sach-chan", label: "Danh sách chặn" },
  { id: "truong-tuy-chinh", label: "Các trường tùy chỉnh" },
  { id: "nhap-thong-ke", label: "Nhập thống kê" },
  { id: "the", label: "Thẻ" },
];

const COLOR_OPTIONS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#64748b", "#1e293b",
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} thg ${d.getMonth() + 1}, ${d.getFullYear()}`;
}

// ─── Danh Bạ (Contact Lists) Tab ─────────────────────────────────────────────

function TaoDanhBaDialog({
  open,
  onClose,
  onSave,
  loading,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (v: CreateMktContactListInput) => void;
  loading: boolean;
  initial?: MktContactListDto;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? "#6366f1");
  const [description, setDescription] = useState(initial?.description ?? "");

  const isEdit = !!initial;
  const minLen = 3;
  const valid = name.trim().length >= minLen;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Chỉnh sửa danh bạ" : "Tạo danh sách"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div>
            <Label className="text-sm font-medium">Tên danh bạ</Label>
            <Input
              className={`mt-1 ${!valid && name.length > 0 ? "border-red-400 focus-visible:ring-red-400" : ""}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên danh bạ"
              autoFocus
            />
            {!valid && name.length > 0 && (
              <p className="mt-1 text-xs text-red-500">Bạn cần nhập tên có độ dài ít nhất {minLen} ký tự</p>
            )}
          </div>
          <div>
            <Label className="text-sm font-medium">Mô tả (tùy chọn)</Label>
            <Textarea
              className="mt-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn..."
              rows={2}
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Màu sắc</Label>
            <div className="flex flex-wrap gap-2 mt-2">
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
            disabled={!valid || loading}
            onClick={() => onSave({ name: name.trim(), description: description || undefined, color })}
          >
            {loading ? "Đang lưu..." : isEdit ? "Lưu" : "Tạo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ThemLienLacDialog({
  open,
  onClose,
  lists,
}: {
  open: boolean;
  onClose: () => void;
  lists: MktContactListDto[];
}) {
  const qc = useQueryClient();
  const [step, setStep] = useState<"choose" | "single">("choose");
  const [form, setForm] = useState<CreateMktContactInput>({ fullName: "", email: "", tagIds: [], listIds: [] });
  const { data: tags = [] } = useQuery({ queryKey: ["mkt-tags"], queryFn: listMktTags });

  const createMutation = useMutation({
    mutationFn: createMktContact,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mkt-contacts"] });
      qc.invalidateQueries({ queryKey: ["mkt-contact-lists"] });
      toast.success("Đã thêm liên lạc");
      onClose();
      setStep("choose");
      setForm({ fullName: "", email: "", tagIds: [], listIds: [] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: keyof CreateMktContactInput, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const handleClose = () => {
    onClose();
    setStep("choose");
    setForm({ fullName: "", email: "", tagIds: [], listIds: [] });
  };

  if (step === "single") {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Thêm liên lạc mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Họ tên *</Label>
                <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Nguyễn Văn A" />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="contact@email.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Số điện thoại</Label>
                <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="0901234567" />
              </div>
              <div>
                <Label>Nguồn</Label>
                <Input value={form.source ?? ""} onChange={(e) => set("source", e.target.value)} placeholder="Facebook, Landing Page..." />
              </div>
            </div>
            <div>
              <Label>Danh bạ</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {lists.map((l) => {
                  const selected = (form.listIds ?? []).includes(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${selected ? "border-transparent text-white" : "border-border text-muted-foreground hover:border-foreground"}`}
                      style={selected ? { backgroundColor: l.color } : {}}
                      onClick={() => set("listIds", selected ? (form.listIds ?? []).filter((id) => id !== l.id) : [...(form.listIds ?? []), l.id])}
                    >
                      {l.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label>Thẻ</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {tags.map((t) => {
                  const selected = (form.tagIds ?? []).includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${selected ? "border-transparent text-white" : "border-border text-muted-foreground hover:border-foreground"}`}
                      style={selected ? { backgroundColor: t.color } : {}}
                      onClick={() => set("tagIds", selected ? (form.tagIds ?? []).filter((id) => id !== t.id) : [...(form.tagIds ?? []), t.id])}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStep("choose")}>Quay lại</Button>
            <Button
              disabled={!form.fullName.trim() || !form.email.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate(form)}
            >
              {createMutation.isPending ? "Đang lưu..." : "Thêm liên lạc"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Bạn muốn thêm liên lạc bằng cách nào?</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <button
            type="button"
            className="flex flex-col items-center gap-2 rounded-lg border p-5 text-sm font-medium hover:bg-muted/50 transition-colors"
            onClick={() => setStep("single")}
          >
            <UserPlus className="h-8 w-8 text-muted-foreground" />
            Từng liên lạc một
          </button>
          <button
            type="button"
            className="flex flex-col items-center gap-2 rounded-lg border p-5 text-sm font-medium hover:bg-muted/50 transition-colors text-muted-foreground cursor-not-allowed"
            disabled
          >
            <FileUp className="h-8 w-8" />
            Từ tệp
          </button>
          <button
            type="button"
            className="flex flex-col items-center gap-2 rounded-lg border p-5 text-sm font-medium hover:bg-muted/50 transition-colors text-muted-foreground cursor-not-allowed"
            disabled
          >
            <Plug className="h-8 w-8" />
            Qua tính năng tích hợp
          </button>
          <Link
            href="/forms"
            onClick={handleClose}
            className="flex flex-col items-center gap-2 rounded-lg border p-5 text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
            Thông qua biểu mẫu đăng ký
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DanhBaTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MktContactListDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MktContactListDto | null>(null);

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ["mkt-contact-lists"],
    queryFn: listMktContactLists,
  });

  const { data: contactsResp } = useQuery({
    queryKey: ["mkt-contacts", { limit: 1 }],
    queryFn: () => listMktContacts({ limit: 1 }),
  });
  const totalContacts = contactsResp?.total ?? 0;

  const createMutation = useMutation({
    mutationFn: createMktContactList,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-contact-lists"] }); setCreateOpen(false); toast.success("Đã tạo danh bạ"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateMktContactListInput }) => updateMktContactList(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-contact-lists"] }); setEditTarget(null); toast.success("Đã cập nhật"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMktContactList,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-contact-lists"] }); setDeleteTarget(null); toast.success("Đã xóa danh bạ"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = lists.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()));
  const defaultList = lists[0];

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="rounded-lg border bg-card px-5 py-4">
        <p className="text-center text-sm text-muted-foreground mb-2">
          Tài khoản của bạn hiện có <span className="font-semibold text-foreground">{totalContacts.toLocaleString()}</span> liên lạc
        </p>
        <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-cyan-500 transition-all"
            style={{ width: `${Math.min(100, (totalContacts / 500) * 100)}%` }}
          />
          {totalContacts > 0 && (
            <div
              className="absolute top-0 h-full flex items-center"
              style={{ left: `calc(${Math.min(100, (totalContacts / 500) * 100)}% - 10px)` }}
            >
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[9px] font-bold text-white shadow">
                {totalContacts}
              </span>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-1">500 liên lạc</p>
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Tìm kiếm danh sách theo tên"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Tạo danh bạ
          </Button>
          <Button onClick={() => setAddContactOpen(true)} className="bg-cyan-500 hover:bg-cyan-600 text-white">
            <Plus className="mr-2 h-4 w-4" /> Thêm liên lạc
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tên</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Được tạo vào ngày</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Số lượng liên lạc</th>
              <th className="w-10 px-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-t">
                  {Array.from({ length: 4 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-muted animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  {search ? "Không tìm thấy danh bạ nào" : "Chưa có danh bạ nào. Nhấn \"Tạo danh bạ\" để bắt đầu."}
                </td>
              </tr>
            ) : (
              filtered.map((list) => {
                const isDefault = list.id === defaultList?.id;
                return (
                  <tr key={list.id} className="border-t hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: list.color }}
                        />
                        <span className="font-medium">{list.name}</span>
                        {isDefault && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-semibold tracking-wide">
                            MẶC ĐỊNH
                          </Badge>
                        )}
                      </div>
                      {list.description && (
                        <p className="ml-5 mt-0.5 text-xs text-muted-foreground line-clamp-1">{list.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(list.createdAt)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{list.memberCount.toLocaleString()}</td>
                    <td className="px-2 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditTarget(list)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" /> Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(list)}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Xóa danh bạ
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <TaoDanhBaDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={(d) => createMutation.mutate(d)}
        loading={createMutation.isPending}
      />

      {editTarget && (
        <TaoDanhBaDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          initial={editTarget}
          onSave={(d) => updateMutation.mutate({ id: editTarget.id, data: d })}
          loading={updateMutation.isPending}
        />
      )}

      <ThemLienLacDialog
        open={addContactOpen}
        onClose={() => setAddContactOpen(false)}
        lists={lists}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa danh bạ?</AlertDialogTitle>
            <AlertDialogDescription>
              Danh bạ &quot;{deleteTarget?.name}&quot; sẽ bị xóa. Các liên lạc trong danh bạ sẽ không bị ảnh hưởng.
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

// ─── Tìm Kiếm (Search Contacts) Tab ──────────────────────────────────────────

function TimKiemTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterListId, setFilterListId] = useState<string>("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<MktContactDto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["mkt-contacts", search, filterListId, page],
    queryFn: () => listMktContacts({ search: search || undefined, listId: filterListId || undefined, page, limit: 50 }),
    placeholderData: (prev) => prev,
  });
  const { data: lists = [] } = useQuery({ queryKey: ["mkt-contact-lists"], queryFn: listMktContactLists });

  const deleteMutation = useMutation({
    mutationFn: deleteMktContact,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mkt-contacts"] });
      qc.invalidateQueries({ queryKey: ["mkt-contact-lists"] });
      setDeleteTarget(null);
      toast.success("Đã xóa liên lạc");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Tìm theo tên, email, SĐT..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select
          value={filterListId || "_all"}
          onValueChange={(v) => { setFilterListId(v === "_all" ? "" : v); setPage(1); }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Tất cả danh bạ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Tất cả danh bạ</SelectItem>
            {lists.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Họ tên</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">SĐT</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Danh bạ</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Thẻ</th>
              <th className="w-20 px-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-muted animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (data?.data ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  {search ? "Không tìm thấy liên lạc nào" : "Chưa có liên lạc nào"}
                </td>
              </tr>
            ) : (
              (data?.data ?? []).map((c) => (
                <tr key={c.id} className={`border-t hover:bg-muted/20 transition-colors ${c.unsubscribed ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-medium">{c.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.lists.slice(0, 2).map((l) => (
                        <span key={l.id} className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: l.color }}>
                          {l.name}
                        </span>
                      ))}
                      {c.lists.length > 2 && <span className="text-xs text-muted-foreground">+{c.lists.length - 2}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.slice(0, 2).map((t) => (
                        <span key={t.id} className="rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: t.color + "22", color: t.color }}>
                          {t.name}
                        </span>
                      ))}
                      {c.tags.length > 2 && <span className="text-xs text-muted-foreground">+{c.tags.length - 2}</span>}
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                        <Link href={`/marketing/contacts/${c.id}`}>
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trước</Button>
          <span className="text-sm text-muted-foreground">Trang {page}/{totalPages} ({data?.total ?? 0} liên lạc)</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Sau</Button>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa liên lạc?</AlertDialogTitle>
            <AlertDialogDescription>
              Liên lạc &quot;{deleteTarget?.fullName}&quot; ({deleteTarget?.email}) sẽ bị xóa vĩnh viễn.
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

// ─── Thẻ (Tags) Tab ───────────────────────────────────────────────────────────

function TheTab() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MktTagDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MktTagDto | null>(null);

  const { data: tags = [], isLoading } = useQuery({ queryKey: ["mkt-tags"], queryFn: listMktTags });

  const createMutation = useMutation({
    mutationFn: createMktTag,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-tags"] }); setCreateOpen(false); toast.success("Đã tạo thẻ"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateMktTagInput }) => updateMktTag(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-tags"] }); setEditTarget(null); toast.success("Đã cập nhật thẻ"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteMktTag,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-tags"] }); setDeleteTarget(null); toast.success("Đã xóa thẻ"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Tạo thẻ mới
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-8 w-24 rounded-full bg-muted animate-pulse" />)}
        </div>
      ) : tags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Tag className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Chưa có thẻ nào. Tạo thẻ để phân loại liên lạc.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Thẻ</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Slug</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Số liên lạc</th>
                <th className="w-20 px-2" />
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr key={tag.id} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: tag.color }}>
                      {tag.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{tag.slug}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{tag.contactCount}</td>
                  <td className="px-2 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditTarget(tag)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(tag)}>
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
        <TagFormDialog open={!!editTarget} onClose={() => setEditTarget(null)} initial={editTarget} onSave={(d) => updateMutation.mutate({ id: editTarget.id, data: d })} loading={updateMutation.isPending} />
      )}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa thẻ?</AlertDialogTitle>
            <AlertDialogDescription>Thẻ &quot;{deleteTarget?.name}&quot; sẽ bị xóa khỏi tất cả liên lạc.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TagFormDialog({
  open, onClose, initial, onSave, loading,
}: {
  open: boolean; onClose: () => void; initial?: MktTagDto; onSave: (v: CreateMktTagInput) => void; loading: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? "#8b5cf6");
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? "Sửa thẻ" : "Tạo thẻ mới"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div>
            <Label>Tên thẻ *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Khách VIP" />
          </div>
          <div>
            <Label>Màu sắc</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {COLOR_OPTIONS.map((c) => (
                <button key={c} type="button" className={`h-7 w-7 rounded-full border-2 transition-transform ${color === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} onClick={() => setColor(c)} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Xem trước:</span>
            <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: color }}>{name || "Tên thẻ"}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Hủy</Button>
          <Button disabled={!name.trim() || loading} onClick={() => onSave({ name: name.trim(), color })}>
            {loading ? "Đang lưu..." : initial ? "Lưu" : "Tạo thẻ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Stub Tab ─────────────────────────────────────────────────────────────────

function StubTab({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
      <div className="rounded-full bg-muted p-4">
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-lg font-medium">{label}</p>
      <p className="text-sm text-muted-foreground">Tính năng này sẽ sớm ra mắt.</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LienLacPage() {
  const [activeTab, setActiveTab] = useState<Tab>("danh-ba");

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Page header */}
      <div className="border-b bg-background px-6 pt-5 pb-0 flex-shrink-0">
        <h1 className="text-xl font-semibold tracking-tight mb-4">Liên lạc</h1>

        {/* Tab navigation */}
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-cyan-600 dark:text-cyan-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "danh-ba" && <DanhBaTab />}
        {activeTab === "tim-kiem" && <TimKiemTab />}
        {activeTab === "phan-khuc" && <StubTab label="Phân khúc" />}
        {activeTab === "bao-cao" && <StubTab label="Báo cáo" />}
        {activeTab === "don-dep" && <StubTab label="Dọn dẹp danh bạ" />}
        {activeTab === "danh-sach-chan" && <StubTab label="Danh sách chặn" />}
        {activeTab === "truong-tuy-chinh" && <StubTab label="Các trường tùy chỉnh" />}
        {activeTab === "nhap-thong-ke" && <StubTab label="Nhập thống kê" />}
        {activeTab === "the" && <TheTab />}
      </div>
    </div>
  );
}

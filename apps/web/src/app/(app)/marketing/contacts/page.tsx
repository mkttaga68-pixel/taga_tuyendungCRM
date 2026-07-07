"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, Search, Trash2, ExternalLink } from "lucide-react";
import { listMktContacts, createMktContact, deleteMktContact, listMktContactLists, listMktTags } from "@/lib/mkt-api";
import type { CreateMktContactInput, MktContactDto } from "@taga-crm/shared";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function CreateContactDialog({
  open,
  onClose,
  onSave,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (v: CreateMktContactInput) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<CreateMktContactInput>({ fullName: "", email: "", tagIds: [], listIds: [] });
  const { data: lists = [] } = useQuery({ queryKey: ["mkt-contact-lists"], queryFn: listMktContactLists });
  const { data: tags = [] } = useQuery({ queryKey: ["mkt-tags"], queryFn: listMktTags });

  const set = (k: keyof CreateMktContactInput, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm contact mới</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
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
            <Label>Danh sách</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {lists.map((l) => {
                const selected = (form.listIds ?? []).includes(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${selected ? "border-transparent text-white" : "border-border text-muted-foreground"}`}
                    style={selected ? { backgroundColor: l.color } : {}}
                    onClick={() =>
                      set("listIds", selected
                        ? (form.listIds ?? []).filter((id) => id !== l.id)
                        : [...(form.listIds ?? []), l.id])
                    }
                  >
                    {l.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {tags.map((t) => {
                const selected = (form.tagIds ?? []).includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${selected ? "border-transparent text-white" : "border-border text-muted-foreground"}`}
                    style={selected ? { backgroundColor: t.color } : {}}
                    onClick={() =>
                      set("tagIds", selected
                        ? (form.tagIds ?? []).filter((id) => id !== t.id)
                        : [...(form.tagIds ?? []), t.id])
                    }
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Hủy</Button>
          <Button
            disabled={!form.fullName.trim() || !form.email.trim() || loading}
            onClick={() => onSave(form)}
          >
            {loading ? "Đang lưu..." : "Thêm contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ContactsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterListId, setFilterListId] = useState<string>("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MktContactDto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["mkt-contacts", search, filterListId, page],
    queryFn: () => listMktContacts({ search: search || undefined, listId: filterListId || undefined, page, limit: 50 }),
    placeholderData: (prev) => prev,
  });
  const { data: lists = [] } = useQuery({ queryKey: ["mkt-contact-lists"], queryFn: listMktContactLists });

  const createMutation = useMutation({
    mutationFn: createMktContact,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-contacts"] }); setCreateOpen(false); toast.success("Đã thêm contact"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMktContact,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-contacts"] }); setDeleteTarget(null); toast.success("Đã xóa contact"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="h-full overflow-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground">Danh bạ khách hàng và đối tượng marketing</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Thêm contact
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Tìm theo tên, email, SĐT..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select
          value={filterListId}
          onValueChange={(v) => { setFilterListId(v === "_all" ? "" : v); setPage(1); }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Tất cả danh sách" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Tất cả danh sách</SelectItem>
            {lists.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>SĐT</TableHead>
              <TableHead>Danh sách</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}><div className="h-4 rounded bg-muted animate-pulse" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : (data?.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Chưa có contact nào
                </TableCell>
              </TableRow>
            ) : (
              (data?.data ?? []).map((c) => (
                <TableRow key={c.id} className={c.unsubscribed ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{c.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  <TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.lists.slice(0, 2).map((l) => (
                        <span key={l.id} className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: l.color }}>
                          {l.name}
                        </span>
                      ))}
                      {c.lists.length > 2 && <span className="text-xs text-muted-foreground">+{c.lists.length - 2}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.tags.slice(0, 2).map((t) => (
                        <Badge key={t.id} variant="secondary" className="text-[10px] px-1.5" style={{ backgroundColor: t.color + "22", color: t.color }}>
                          {t.name}
                        </Badge>
                      ))}
                      {c.tags.length > 2 && <span className="text-xs text-muted-foreground">+{c.tags.length - 2}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(c.createdAt)}</TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trước</Button>
          <span className="text-sm text-muted-foreground">Trang {page}/{totalPages} ({data?.total ?? 0} contacts)</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Sau</Button>
        </div>
      )}

      <CreateContactDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={(d) => createMutation.mutate(d)}
        loading={createMutation.isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa contact?</AlertDialogTitle>
            <AlertDialogDescription>
              Contact &quot;{deleteTarget?.fullName}&quot; ({deleteTarget?.email}) sẽ bị xóa.
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

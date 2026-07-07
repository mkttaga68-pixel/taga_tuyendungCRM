"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Users,
} from "lucide-react";
import {
  getMktCampaign,
  listMktCampaignEmails,
  addMktCampaignEmail,
  updateMktCampaignEmail,
  deleteMktCampaignEmail,
  activateMktCampaign,
  pauseMktCampaign,
  listMktCampaignEnrollments,
  enrollContactsToCampaign,
  listMktContacts,
} from "@/lib/mkt-api";
import type {
  MktCampaignEmailDto,
  CreateMktCampaignEmailInput,
  MktSendWindow,
  MktDelayUnit,
} from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const DELAY_UNIT_LABELS: Record<MktDelayUnit, string> = {
  MINUTES: "phút",
  HOURS: "giờ",
  DAYS: "ngày",
  WEEKS: "tuần",
};

const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nháp",
  ACTIVE: "Đang chạy",
  PAUSED: "Tạm dừng",
  ARCHIVED: "Lưu trữ",
  COMPLETED: "Hoàn thành",
  UNSUBSCRIBED: "Đã hủy",
  FAILED: "Thất bại",
};
const ENROLLMENT_STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  ACTIVE: "default",
  COMPLETED: "secondary",
  UNSUBSCRIBED: "destructive",
  FAILED: "destructive",
};

function EmailStepCard({
  email,
  index,
  total,
  onDelete,
  onEdit,
  onMoveUp,
  onMoveDown,
}: {
  email: MktCampaignEmailDto;
  index: number;
  total: number;
  onDelete: () => void;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const sw = email.sendWindow as MktSendWindow;
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-start gap-3 p-4">
        <div className="flex flex-col gap-1 mt-0.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={onMoveUp}
            disabled={index === 0}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={onMoveDown}
            disabled={index === total - 1}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-muted text-sm font-bold flex-shrink-0">
          {email.position}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{email.subject}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {email.position === 1
              ? "Gửi ngay lập tức"
              : `Chờ ${email.delayValue} ${DELAY_UNIT_LABELS[email.delayUnit]} sau bước trước`}
            {" · "}
            Giờ gửi: {sw.from}–{sw.to}
            {" · "}
            Ngày: {sw.days.map((d) => DAY_NAMES[d]).join(", ")}
          </p>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground tabular-nums flex-shrink-0">
          <div className="text-center">
            <p className="font-semibold text-foreground">{email.stats.sent}</p>
            <p>Đã gửi</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">{email.stats.openRate}%</p>
            <p>Open</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">{email.stats.ctr}%</p>
            <p>CTR</p>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button size="sm" variant="outline" onClick={onEdit}>Sửa</Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_SEND_WINDOW: MktSendWindow = {
  from: "08:00",
  to: "20:00",
  days: [1, 2, 3, 4, 5],
  tz: "Asia/Ho_Chi_Minh",
};

function EmailStepDialog({
  open,
  onClose,
  initial,
  onSave,
  loading,
  isFirst,
}: {
  open: boolean;
  onClose: () => void;
  initial?: MktCampaignEmailDto;
  onSave: (v: CreateMktCampaignEmailInput) => void;
  loading: boolean;
  isFirst: boolean;
}) {
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [bodyHtml, setBodyHtml] = useState(initial?.bodyHtml ?? "");
  const [delayValue, setDelayValue] = useState(initial?.delayValue ?? 1);
  const [delayUnit, setDelayUnit] = useState<MktDelayUnit>(initial?.delayUnit ?? "DAYS");
  const [sendWindow, setSendWindow] = useState<MktSendWindow>(
    (initial?.sendWindow as MktSendWindow) ?? DEFAULT_SEND_WINDOW,
  );

  const toggleDay = (d: number) => {
    setSendWindow((sw) => ({
      ...sw,
      days: sw.days.includes(d) ? sw.days.filter((x) => x !== d) : [...sw.days, d].sort(),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Sửa email" : "Thêm email vào sequence"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tiêu đề email *</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Chào mừng bạn đến với Taga!" />
          </div>
          <div>
            <Label>Nội dung email (HTML) *</Label>
            <Textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              placeholder="<p>Xin chào {{fullName}},</p><p>Cảm ơn bạn đã...</p>"
              rows={8}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground mt-1">Biến: {"{{"} fullName {"}}"}, {"{{"} email {"}}"}</p>
          </div>
          {!isFirst && (
            <div>
              <Label>Thời gian chờ sau bước trước</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  min={0}
                  value={delayValue}
                  onChange={(e) => setDelayValue(Number(e.target.value))}
                  className="w-24"
                />
                <Select value={delayUnit} onValueChange={(v) => setDelayUnit(v as MktDelayUnit)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MINUTES">Phút</SelectItem>
                    <SelectItem value="HOURS">Giờ</SelectItem>
                    <SelectItem value="DAYS">Ngày</SelectItem>
                    <SelectItem value="WEEKS">Tuần</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div>
            <Label>Cửa sổ gửi email</Label>
            <div className="flex gap-2 mt-1 items-center flex-wrap">
              <span className="text-sm">Từ</span>
              <Input
                type="time"
                value={sendWindow.from}
                onChange={(e) => setSendWindow((sw) => ({ ...sw, from: e.target.value }))}
                className="w-28"
              />
              <span className="text-sm">đến</span>
              <Input
                type="time"
                value={sendWindow.to}
                onChange={(e) => setSendWindow((sw) => ({ ...sw, to: e.target.value }))}
                className="w-28"
              />
              <span className="text-sm ml-2">Ngày:</span>
              {DAY_NAMES.map((name, d) => (
                <button
                  key={d}
                  type="button"
                  className={`h-7 w-7 rounded-full text-xs font-medium border transition-colors ${sendWindow.days.includes(d) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
                  onClick={() => toggleDay(d)}
                >
                  {name}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Timezone: Asia/Ho_Chi_Minh. Nếu giờ lên lịch nằm ngoài cửa sổ, email sẽ tự dời sang slot tiếp theo hợp lệ.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Hủy</Button>
          <Button
            disabled={!subject.trim() || !bodyHtml.trim() || loading}
            onClick={() =>
              onSave({
                subject,
                bodyHtml,
                delayValue: isFirst ? 0 : delayValue,
                delayUnit,
                sendWindow,
                condition: {},
              })
            }
          >
            {loading ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: campaign } = useQuery({ queryKey: ["mkt-campaign", id], queryFn: () => getMktCampaign(id) });
  const { data: emails = [] } = useQuery({ queryKey: ["mkt-campaign-emails", id], queryFn: () => listMktCampaignEmails(id) });
  const { data: enrollments = [] } = useQuery({ queryKey: ["mkt-campaign-enrollments", id], queryFn: () => listMktCampaignEnrollments(id) });

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MktCampaignEmailDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MktCampaignEmailDto | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

  const { data: contacts } = useQuery({
    queryKey: ["mkt-contacts-for-enroll"],
    queryFn: () => listMktContacts({ limit: 200 }),
    enabled: enrollOpen,
  });

  const addEmailMutation = useMutation({
    mutationFn: (input: CreateMktCampaignEmailInput) => addMktCampaignEmail(id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-campaign-emails", id] }); qc.invalidateQueries({ queryKey: ["mkt-campaign", id] }); setAddOpen(false); toast.success("Đã thêm email"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateEmailMutation = useMutation({
    mutationFn: ({ emailId, input }: { emailId: string; input: CreateMktCampaignEmailInput }) =>
      updateMktCampaignEmail(id, emailId, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-campaign-emails", id] }); setEditTarget(null); toast.success("Đã cập nhật email"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteEmailMutation = useMutation({
    mutationFn: (emailId: string) => deleteMktCampaignEmail(id, emailId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-campaign-emails", id] }); qc.invalidateQueries({ queryKey: ["mkt-campaign", id] }); setDeleteTarget(null); toast.success("Đã xóa email"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const activateMutation = useMutation({
    mutationFn: () => activateMktCampaign(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-campaign", id] }); toast.success("Đã kích hoạt chiến dịch"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const pauseMutation = useMutation({
    mutationFn: () => pauseMktCampaign(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mkt-campaign", id] }); toast.success("Đã tạm dừng chiến dịch"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const enrollMutation = useMutation({
    mutationFn: () => enrollContactsToCampaign(id, { contactIds: selectedContactIds }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["mkt-campaign-enrollments", id] });
      qc.invalidateQueries({ queryKey: ["mkt-campaign", id] });
      setEnrollOpen(false);
      setSelectedContactIds([]);
      toast.success(`Đã enroll ${res.enrolled} contacts`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleMoveUp = async (email: MktCampaignEmailDto) => {
    if (email.position <= 1) return;
    const { reorderMktCampaignEmail } = await import("@/lib/mkt-api");
    await reorderMktCampaignEmail(id, email.id, email.position - 1);
    qc.invalidateQueries({ queryKey: ["mkt-campaign-emails", id] });
  };

  const handleMoveDown = async (email: MktCampaignEmailDto) => {
    if (email.position >= emails.length) return;
    const { reorderMktCampaignEmail } = await import("@/lib/mkt-api");
    await reorderMktCampaignEmail(id, email.id, email.position + 1);
    qc.invalidateQueries({ queryKey: ["mkt-campaign-emails", id] });
  };

  if (!campaign) {
    return <div className="h-full flex items-center justify-center p-6 text-muted-foreground">Đang tải...</div>;
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/marketing/campaigns"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
          <p className="text-sm text-muted-foreground">Từ: {campaign.fromName} &lt;{campaign.fromEmail}&gt;</p>
        </div>
        <Badge variant={campaign.status === "ACTIVE" ? "default" : "secondary"}>
          {STATUS_LABELS[campaign.status] ?? campaign.status}
        </Badge>
        {campaign.status === "DRAFT" || campaign.status === "PAUSED" ? (
          <Button onClick={() => activateMutation.mutate()} disabled={activateMutation.isPending || campaign.emailCount === 0}>
            <Play className="mr-2 h-4 w-4" /> Kích hoạt
          </Button>
        ) : campaign.status === "ACTIVE" ? (
          <Button variant="outline" onClick={() => pauseMutation.mutate()} disabled={pauseMutation.isPending}>
            <Pause className="mr-2 h-4 w-4" /> Tạm dừng
          </Button>
        ) : null}
        {campaign.status === "ACTIVE" && (
          <Button variant="outline" onClick={() => setEnrollOpen(true)}>
            <Users className="mr-2 h-4 w-4" /> Enroll contacts
          </Button>
        )}
      </div>

      <Tabs defaultValue="sequence">
        <TabsList>
          <TabsTrigger value="sequence">Chuỗi email ({campaign.emailCount})</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments ({campaign.enrollmentCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="sequence" className="mt-4 space-y-3">
          {emails.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              Chưa có email nào trong sequence. Thêm email đầu tiên.
            </div>
          ) : (
            emails.map((email, i) => (
              <EmailStepCard
                key={email.id}
                email={email}
                index={i}
                total={emails.length}
                onDelete={() => setDeleteTarget(email)}
                onEdit={() => setEditTarget(email)}
                onMoveUp={() => handleMoveUp(email)}
                onMoveDown={() => handleMoveDown(email)}
              />
            ))
          )}
          <Button variant="outline" className="w-full" onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Thêm email vào sequence
          </Button>
        </TabsContent>

        <TabsContent value="enrollments" className="mt-4">
          {enrollments.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              Chưa có ai enroll vào chiến dịch này.
              {campaign.status !== "ACTIVE" && " Kích hoạt chiến dịch trước khi enroll contacts."}
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2">Contact</th>
                    <th className="text-left px-4 py-2">Trạng thái</th>
                    <th className="text-right px-4 py-2">Bước hiện tại</th>
                    <th className="text-right px-4 py-2">Ngày enroll</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((e) => (
                    <tr key={e.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-2">
                        <p className="font-medium">{e.contactName}</p>
                        <p className="text-xs text-muted-foreground">{e.contactEmail}</p>
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={ENROLLMENT_STATUS_VARIANTS[e.status] ?? "secondary"}>
                          {STATUS_LABELS[e.status] ?? e.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{e.currentStep}/{campaign.emailCount}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                        {new Date(e.enrolledAt).toLocaleDateString("vi-VN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <EmailStepDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(d) => addEmailMutation.mutate(d)}
        loading={addEmailMutation.isPending}
        isFirst={emails.length === 0}
      />

      {editTarget && (
        <EmailStepDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          initial={editTarget}
          onSave={(d) => updateEmailMutation.mutate({ emailId: editTarget.id, input: d })}
          loading={updateEmailMutation.isPending}
          isFirst={editTarget.position === 1}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa email khỏi sequence?</AlertDialogTitle>
            <AlertDialogDescription>
              Email &quot;{deleteTarget?.subject}&quot; sẽ bị xóa. Các email sau sẽ được đánh số lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteEmailMutation.mutate(deleteTarget.id)}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Enroll dialog */}
      <Dialog open={enrollOpen} onOpenChange={(o) => !o && setEnrollOpen(false)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enroll contacts vào chiến dịch</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Chọn contacts để bắt đầu nhận email sequence.</p>
          <div className="space-y-1 max-h-64 overflow-y-auto border rounded-md p-2">
            {(contacts?.data ?? []).map((c) => {
              const selected = selectedContactIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`w-full text-left rounded px-2 py-1.5 text-sm flex items-center gap-2 transition-colors ${selected ? "bg-primary/10" : "hover:bg-muted"}`}
                  onClick={() =>
                    setSelectedContactIds((prev) =>
                      selected ? prev.filter((x) => x !== c.id) : [...prev, c.id],
                    )
                  }
                >
                  <div className={`h-3.5 w-3.5 rounded border flex-shrink-0 ${selected ? "bg-primary border-primary" : "border-muted-foreground"}`} />
                  <span className="font-medium">{c.fullName}</span>
                  <span className="text-muted-foreground">{c.email}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">Đã chọn: {selectedContactIds.length} contacts</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollOpen(false)}>Hủy</Button>
            <Button
              disabled={selectedContactIds.length === 0 || enrollMutation.isPending}
              onClick={() => enrollMutation.mutate()}
            >
              {enrollMutation.isPending ? "Đang enroll..." : `Enroll ${selectedContactIds.length} contacts`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

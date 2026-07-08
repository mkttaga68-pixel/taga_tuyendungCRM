"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Pencil, Check, ChevronLeft } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createMktCampaign,
  addMktCampaignEmail,
  listMktContactLists,
} from "@/lib/mkt-api";
import type { MktDelayUnit } from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

type EmailDraft = {
  subject: string;
  description: string;
  delayValue: number;
  delayUnit: MktDelayUnit;
};

type WizardState = {
  // Step 1
  name: string;
  description: string;
  // Step 2
  fromName: string;
  fromEmail: string;
  replyTo: string;
  sendFrom: string;
  sendTo: string;
  sendDays: number[];
  // Step 3
  emails: EmailDraft[];
  // Step 4 – informational, no API effect during wizard
  selectedListIds: string[];
};

const DAYS = [
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
  { value: 0, label: "CN" },
];

const DELAY_UNIT_LABELS: Record<MktDelayUnit, string> = {
  MINUTES: "phút",
  HOURS: "giờ",
  DAYS: "ngày",
  WEEKS: "tuần",
};

const STEPS = [
  { id: 1, label: "Thông tin chiến dịch" },
  { id: 2, label: "Cài đặt chiến dịch" },
  { id: 3, label: "Các bước xử lý cơ hội" },
  { id: 4, label: "Danh bạ & Mục tiêu" },
] as const;

// ─── Step Progress Bar ────────────────────────────────────────────────────────

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex w-full">
      {STEPS.map((s, idx) => {
        const isActive = s.id === current;
        const isDone = s.id < current;
        return (
          <div
            key={s.id}
            className={`flex flex-1 items-center gap-3 px-6 py-4 text-sm font-medium select-none
              ${isActive ? "bg-[#1e3a6e] text-white" : isDone ? "bg-[#2d5499] text-white/90" : "bg-[#dce6f4] text-[#6b8bbf]"}
              ${idx === 0 ? "rounded-tl" : ""}
              ${idx === STEPS.length - 1 ? "rounded-tr" : ""}
            `}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold
                ${isActive ? "border-white/80 text-white" : isDone ? "border-white bg-white text-[#2d5499]" : "border-[#6b8bbf] text-[#6b8bbf]"}`}
            >
              {isDone ? <Check className="h-3 w-3" /> : s.id}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Campaign Info ────────────────────────────────────────────────────

function Step1({
  state,
  onChange,
}: {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
}) {
  return (
    <div className="flex gap-8">
      <div className="flex-1 space-y-5">
        <h2 className="text-base font-semibold text-foreground">Thông tin chiến dịch</h2>
        <div className="space-y-1.5">
          <Label>
            Tên chiến dịch <span className="text-destructive">*</span>
          </Label>
          <Input
            value={state.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={`Chiến dịch email ngày ${new Date().toLocaleDateString("vi-VN")}`}
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Mô tả chiến dịch</Label>
          <Textarea
            value={state.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Mô tả ngắn về mục tiêu và nội dung chiến dịch..."
            rows={4}
          />
        </div>
      </div>

      <aside className="w-80 shrink-0 rounded-lg border bg-muted/40 p-5 text-sm leading-relaxed text-muted-foreground space-y-2">
        <p className="font-semibold text-foreground">Chú thích</p>
        <p>Chiến dịch email là một chuỗi email được gửi tự động đến danh sách liên lạc theo lịch trình đã cài đặt.</p>
        <p className="mt-1">Ví dụ chuỗi chăm sóc ứng viên:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>Email 1 – Ngay sau đăng ký: Xác nhận nhận hồ sơ</li>
          <li>Email 2 – Sau 2 ngày: Giới thiệu công ty &amp; vị trí</li>
          <li>Email 3 – Sau 5 ngày: Mời phỏng vấn</li>
        </ul>
      </aside>
    </div>
  );
}

// ─── Step 2: Campaign Settings ────────────────────────────────────────────────

function Step2({
  state,
  onChange,
}: {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
}) {
  const toggleDay = (d: number) => {
    const next = state.sendDays.includes(d)
      ? state.sendDays.filter((x) => x !== d)
      : [...state.sendDays, d];
    onChange({ sendDays: next });
  };

  return (
    <div className="flex gap-8">
      <div className="flex-1 space-y-6">
        {/* Sender */}
        <div>
          <h2 className="mb-4 text-base font-semibold">Người gửi</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                Tên người gửi <span className="text-destructive">*</span>
              </Label>
              <Input
                value={state.fromName}
                onChange={(e) => onChange({ fromName: e.target.value })}
                placeholder="Taga Group"
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Email gửi <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={state.fromEmail}
                onChange={(e) => onChange({ fromEmail: e.target.value })}
                placeholder="marketing@taga.vn"
              />
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <Label>Reply-To (tùy chọn)</Label>
            <Input
              type="email"
              value={state.replyTo}
              onChange={(e) => onChange({ replyTo: e.target.value })}
              placeholder="reply@taga.vn"
            />
            <p className="text-xs text-muted-foreground">
              Địa chỉ nhận phản hồi khi ứng viên bấm "Trả lời". Để trống = dùng email gửi.
            </p>
          </div>
        </div>

        {/* Send window */}
        <div>
          <h2 className="mb-4 text-base font-semibold">Khung giờ gửi</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Từ giờ</Label>
              <Input
                type="time"
                value={state.sendFrom}
                onChange={(e) => onChange({ sendFrom: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Đến giờ</Label>
              <Input
                type="time"
                value={state.sendTo}
                onChange={(e) => onChange({ sendTo: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label>Ngày trong tuần</Label>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  className={`h-9 w-9 rounded-full text-sm font-medium border transition-colors
                    ${state.sendDays.includes(d.value)
                      ? "bg-[#1e3a6e] text-white border-[#1e3a6e]"
                      : "bg-background text-muted-foreground border-border hover:border-[#1e3a6e]/50"}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Email chỉ được gửi trong các ngày đã chọn.</p>
          </div>
        </div>

        {/* On completion */}
        <div>
          <h2 className="mb-3 text-base font-semibold">Cài đặt khi hoàn thành</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox id="allow-reenroll" />
              <label htmlFor="allow-reenroll" className="text-sm cursor-pointer">
                Cho phép liên lạc đăng ký lại sau khi hoàn thành chiến dịch
              </label>
            </div>
          </div>
        </div>
      </div>

      <aside className="w-80 shrink-0 space-y-3 rounded-lg border bg-muted/40 p-5 text-sm leading-relaxed text-muted-foreground">
        <p className="font-semibold text-foreground">Chú thích</p>
        <p>
          <strong className="text-foreground">Người gửi</strong> là thông tin hiển thị trong hộp thư đến của ứng viên. Dùng tên thương hiệu rõ ràng để tăng tỷ lệ mở email.
        </p>
        <p>
          <strong className="text-foreground">Khung giờ gửi</strong> giúp email đến tay ứng viên vào thời điểm họ có khả năng đọc nhất. Email được lên lịch ra ngoài khung giờ sẽ tự động chờ đến lượt tiếp theo.
        </p>
      </aside>
    </div>
  );
}

// ─── Step 3: Email Sequence ───────────────────────────────────────────────────

function Step3({
  state,
  onChange,
}: {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newDelay, setNewDelay] = useState(1);
  const [newUnit, setNewUnit] = useState<MktDelayUnit>("DAYS");
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const addEmail = () => {
    if (!newSubject.trim()) return;
    onChange({
      emails: [
        ...state.emails,
        { subject: newSubject.trim(), description: "", delayValue: newDelay, delayUnit: newUnit },
      ],
    });
    setNewSubject("");
    setNewDelay(1);
    setNewUnit("DAYS");
    setAdding(false);
  };

  const removeEmail = (idx: number) => {
    onChange({ emails: state.emails.filter((_, i) => i !== idx) });
    if (editIdx === idx) setEditIdx(null);
  };

  const updateEmail = (idx: number, patch: Partial<EmailDraft>) => {
    onChange({
      emails: state.emails.map((e, i) => (i === idx ? { ...e, ...patch } : e)),
    });
  };

  return (
    <div className="flex gap-8">
      <div className="flex-1 space-y-3">
        <h2 className="text-base font-semibold">Chuỗi email tự động</h2>
        <p className="text-sm text-muted-foreground">
          Thêm các email sẽ được gửi tuần tự đến ứng viên. Nội dung chi tiết có thể chỉnh sửa sau khi tạo chiến dịch.
        </p>

        {/* Email step list */}
        <div className="space-y-2 mt-2">
          {state.emails.map((email, idx) => (
            <div key={idx}>
              <div
                className="flex items-center gap-3 rounded-md px-4 py-3 text-white text-sm"
                style={{ background: "#1e3a6e" }}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/40 text-xs font-bold">
                  {idx + 1}
                </span>
                <span className="flex-1 font-medium truncate">{email.subject}</span>
                {idx > 0 && (
                  <span className="text-xs text-white/70 shrink-0">
                    +{email.delayValue} {DELAY_UNIT_LABELS[email.delayUnit]} sau
                  </span>
                )}
                {idx === 0 && (
                  <span className="text-xs text-white/70 shrink-0">Gửi ngay khi đăng ký</span>
                )}
                <button
                  type="button"
                  onClick={() => setEditIdx(editIdx === idx ? null : idx)}
                  className="ml-1 p-1 rounded hover:bg-white/10"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeEmail(idx)}
                  className="p-1 rounded hover:bg-white/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Inline edit for delay */}
              {editIdx === idx && (
                <div className="ml-9 mt-1 rounded-md border bg-muted/40 p-3 space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Tiêu đề email</Label>
                    <Input
                      value={email.subject}
                      onChange={(e) => updateEmail(idx, { subject: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>
                  {idx > 0 && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs shrink-0">Gửi sau</Label>
                      <Input
                        type="number"
                        min={0}
                        value={email.delayValue}
                        onChange={(e) => updateEmail(idx, { delayValue: Number(e.target.value) })}
                        className="h-8 w-20 text-sm"
                      />
                      <Select
                        value={email.delayUnit}
                        onValueChange={(v) => updateEmail(idx, { delayUnit: v as MktDelayUnit })}
                      >
                        <SelectTrigger className="h-8 w-28 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.entries(DELAY_UNIT_LABELS) as [MktDelayUnit, string][]).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground">kể từ email trước</span>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-xs">Ghi chú nội dung (tùy chọn)</Label>
                    <Textarea
                      value={email.description}
                      onChange={(e) => updateEmail(idx, { description: e.target.value })}
                      placeholder="Mô tả ngắn nội dung email này..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add step row */}
        {adding ? (
          <div className="rounded-md border bg-muted/40 p-3 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">
                Tiêu đề email <span className="text-destructive">*</span>
              </Label>
              <Input
                autoFocus
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="VD: Chào mừng bạn đến với Taga Group"
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addEmail(); }
                  if (e.key === "Escape") { setAdding(false); setNewSubject(""); }
                }}
              />
            </div>
            {state.emails.length > 0 && (
              <div className="flex items-center gap-2">
                <Label className="text-xs shrink-0">Gửi sau</Label>
                <Input
                  type="number"
                  min={0}
                  value={newDelay}
                  onChange={(e) => setNewDelay(Number(e.target.value))}
                  className="h-8 w-20 text-sm"
                />
                <Select value={newUnit} onValueChange={(v) => setNewUnit(v as MktDelayUnit)}>
                  <SelectTrigger className="h-8 w-28 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(DELAY_UNIT_LABELS) as [MktDelayUnit, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">kể từ email trước</span>
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={addEmail} disabled={!newSubject.trim()}>
                Thêm
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setAdding(false); setNewSubject(""); }}>
                Hủy
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground hover:border-[#1e3a6e]/50 hover:text-foreground transition-colors"
          >
            <Plus className="h-4 w-4" />
            Thêm bước
          </button>
        )}

        {state.emails.length === 0 && !adding && (
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded px-3 py-2 border border-amber-200 dark:border-amber-800">
            Cần ít nhất 1 email để có thể kích hoạt chiến dịch. Bạn có thể thêm email sau khi tạo.
          </p>
        )}
      </div>

      <aside className="w-80 shrink-0 rounded-lg border bg-muted/40 p-5 text-sm leading-relaxed text-muted-foreground space-y-2">
        <p className="font-semibold text-foreground">Chú thích</p>
        <p>
          Mỗi bước là một email được gửi vào thời điểm đã cài đặt. Email đầu tiên gửi ngay khi ứng viên đăng ký vào chiến dịch.
        </p>
        <p>Ví dụ:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>Bước 1 – Gửi ngay: Xác nhận nhận hồ sơ</li>
          <li>Bước 2 – Sau 2 ngày: Giới thiệu văn hóa công ty</li>
          <li>Bước 3 – Sau 3 ngày: Mời phỏng vấn</li>
        </ul>
        <p className="mt-1 text-xs">
          Nội dung chi tiết của từng email có thể soạn trong trang chi tiết chiến dịch sau khi tạo.
        </p>
      </aside>
    </div>
  );
}

// ─── Step 4: Contact Lists ────────────────────────────────────────────────────

function Step4({
  state,
  onChange,
}: {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
}) {
  const { data: lists = [], isLoading } = useQuery({
    queryKey: ["mkt-contact-lists"],
    queryFn: listMktContactLists,
  });

  const toggleList = (id: string) => {
    const next = state.selectedListIds.includes(id)
      ? state.selectedListIds.filter((x) => x !== id)
      : [...state.selectedListIds, id];
    onChange({ selectedListIds: next });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold">Danh bạ mục tiêu</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Chọn danh bạ sẽ được đăng ký vào chiến dịch này. Việc đăng ký sẽ thực hiện sau khi chiến dịch được{" "}
            <strong className="text-foreground">kích hoạt</strong>.
          </p>
        </div>
        {state.selectedListIds.length > 0 && (
          <Badge variant="secondary">{state.selectedListIds.length} danh bạ đã chọn</Badge>
        )}
      </div>

      {/* Contact list selector */}
      <div className="rounded-md border overflow-hidden">
        <div className="grid grid-cols-3 gap-0 bg-muted/60 px-4 py-2 text-xs font-medium text-muted-foreground border-b">
          <span>Danh bạ</span>
          <span>Số liên lạc</span>
          <span>Ngày tạo</span>
        </div>
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Đang tải danh bạ...</div>
        ) : lists.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Chưa có danh bạ nào.{" "}
            <Link href="/marketing/contacts" className="text-primary hover:underline">
              Tạo danh bạ mới
            </Link>
          </div>
        ) : (
          lists.map((list) => {
            const checked = state.selectedListIds.includes(list.id);
            return (
              <label
                key={list.id}
                className={`grid grid-cols-3 gap-0 px-4 py-3 text-sm cursor-pointer border-b last:border-0 transition-colors
                  ${checked ? "bg-blue-50/60 dark:bg-blue-950/20" : "hover:bg-muted/40"}`}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleList(list.id)}
                  />
                  <span className="font-medium">{list.name}</span>
                </div>
                <span className="flex items-center text-muted-foreground tabular-nums">
                  {list.memberCount ?? 0} liên lạc
                </span>
                <span className="flex items-center text-muted-foreground">
                  {new Date(list.createdAt).toLocaleDateString("vi-VN")}
                </span>
              </label>
            );
          })
        )}
      </div>

      {state.selectedListIds.length > 0 && (
        <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 rounded px-3 py-2 border border-blue-200 dark:border-blue-800">
          Sau khi tạo và kích hoạt chiến dịch, bạn có thể đăng ký toàn bộ liên lạc trong danh bạ đã chọn từ trang chi tiết chiến dịch.
        </p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const INITIAL_STATE: WizardState = {
  name: "",
  description: "",
  fromName: "",
  fromEmail: "",
  replyTo: "",
  sendFrom: "08:00",
  sendTo: "20:00",
  sendDays: [1, 2, 3, 4, 5],
  emails: [],
  selectedListIds: [],
};

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function descToHtml(text: string, subject: string): string {
  const body = text.trim()
    ? text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")
    : `<em style="color:#888">[Nội dung email "${subject}" — soạn trong trang chi tiết chiến dịch]</em>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;padding:24px;max-width:600px;margin:0 auto;">${body}</body></html>`;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const patch = (p: Partial<WizardState>) => setState((s) => ({ ...s, ...p }));

  // ── Validation ──────────────────────────────────────────────────────────────

  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};
    if (s === 1) {
      if (!state.name.trim()) errs.name = "Tên chiến dịch không được để trống";
    }
    if (s === 2) {
      if (!state.fromName.trim()) errs.fromName = "Tên người gửi không được để trống";
      if (!state.fromEmail.trim()) errs.fromEmail = "Email gửi không được để trống";
      else if (!isValidEmail(state.fromEmail)) errs.fromEmail = "Email không hợp lệ";
      if (state.replyTo && !isValidEmail(state.replyTo)) errs.replyTo = "Reply-To email không hợp lệ";
      if (state.sendDays.length === 0) errs.sendDays = "Chọn ít nhất 1 ngày trong tuần";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(4, s + 1) as 1 | 2 | 3 | 4);
  };

  const goBack = () => {
    setErrors({});
    setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4);
  };

  // ── Submission ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async () => {
      const campaign = await createMktCampaign({
        name: state.name.trim(),
        description: state.description.trim() || undefined,
        fromName: state.fromName.trim(),
        fromEmail: state.fromEmail.trim(),
        replyTo: state.replyTo.trim() || undefined,
      });

      const sendWindow = {
        from: state.sendFrom,
        to: state.sendTo,
        days: state.sendDays,
        tz: "Asia/Ho_Chi_Minh",
      };

      for (const email of state.emails) {
        await addMktCampaignEmail(campaign.id, {
          subject: email.subject,
          bodyHtml: descToHtml(email.description, email.subject),
          delayValue: email.delayValue,
          delayUnit: email.delayUnit,
          sendWindow,
          condition: {},
        });
      }

      return campaign;
    },
    onSuccess: (campaign) => {
      toast.success("Chiến dịch đã được tạo thành công");
      router.push(`/marketing/campaigns/${campaign.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleFinish = () => {
    if (!validateStep(step)) return;
    createMutation.mutate();
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-6 py-3 text-sm text-muted-foreground border-b bg-background shrink-0">
        <Link href="/marketing/campaigns" className="flex items-center gap-1 hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
          Quản lý chiến dịch
        </Link>
        <span className="text-border">/</span>
        <span className="text-foreground font-medium">Thêm mới chiến dịch</span>
      </div>

      {/* Step bar */}
      <div className="shrink-0">
        <StepBar current={step} />
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-auto p-8">
        {step === 1 && <Step1 state={state} onChange={patch} />}
        {step === 2 && <Step2 state={state} onChange={patch} />}
        {step === 3 && <Step3 state={state} onChange={patch} />}
        {step === 4 && <Step4 state={state} onChange={patch} />}

        {/* Inline field errors */}
        {Object.keys(errors).length > 0 && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive space-y-1">
            {Object.values(errors).map((msg, i) => (
              <p key={i}>• {msg}</p>
            ))}
          </div>
        )}
      </div>

      {/* Footer navigation */}
      <div className="shrink-0 flex items-center justify-between border-t bg-background px-8 py-4">
        <Button variant="outline" onClick={goBack} disabled={step === 1}>
          Quay lại
        </Button>
        {step < 4 ? (
          <Button onClick={goNext}>Tiếp theo</Button>
        ) : (
          <Button
            onClick={handleFinish}
            disabled={createMutation.isPending}
            className="bg-[#1e3a6e] hover:bg-[#16305c] text-white"
          >
            {createMutation.isPending ? "Đang tạo..." : "Hoàn thành"}
          </Button>
        )}
      </div>
    </div>
  );
}

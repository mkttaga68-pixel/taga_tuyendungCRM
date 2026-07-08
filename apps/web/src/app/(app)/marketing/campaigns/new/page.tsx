"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Pencil, Check, ChevronLeft } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createMktCampaign,
  listMktContactLists,
} from "@/lib/mkt-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

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
  stages: string[];
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
              Địa chỉ nhận phản hồi khi ứng viên bấm &quot;Trả lời&quot;. Để trống = dùng email gửi.
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

// ─── Step 3: Opportunity Processing Steps ────────────────────────────────────

function Step3({
  state,
  onChange,
}: {
  state: WizardState;
  onChange: (patch: Partial<WizardState>) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const addStage = () => {
    if (!newName.trim()) return;
    onChange({ stages: [...state.stages, newName.trim()] });
    setNewName("");
    setAdding(false);
  };

  const removeStage = (idx: number) => {
    onChange({ stages: state.stages.filter((_, i) => i !== idx) });
    if (editIdx === idx) setEditIdx(null);
  };

  const startEdit = (idx: number) => {
    setEditIdx(idx);
    setEditName(state.stages[idx] ?? "");
  };

  const saveEdit = () => {
    if (editIdx === null || !editName.trim()) return;
    onChange({
      stages: state.stages.map((s, i) => (i === editIdx ? editName.trim() : s)),
    });
    setEditIdx(null);
    setEditName("");
  };

  return (
    <div className="flex gap-8">
      <div className="flex-1 space-y-3">
        <h2 className="text-base font-semibold">Các bước xử lý cơ hội</h2>
        <p className="text-sm text-muted-foreground">
          Định nghĩa các bước trong quy trình xử lý cơ hội tuyển dụng của chiến dịch này.
        </p>

        <div className="space-y-2 mt-2">
          {state.stages.map((stage, idx) => (
            <div key={idx}>
              {editIdx === idx ? (
                <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-4 py-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-bold text-muted-foreground">
                    {idx + 1}
                  </span>
                  <Input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-7 text-sm flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); saveEdit(); }
                      if (e.key === "Escape") { setEditIdx(null); setEditName(""); }
                    }}
                  />
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={saveEdit}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div
                  className="flex items-center gap-3 rounded-md px-4 py-3 text-white text-sm"
                  style={{ background: "#1e3a6e" }}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/40 text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span className="flex-1 font-medium">{stage}</span>
                  <button
                    type="button"
                    onClick={() => startEdit(idx)}
                    className="p-1 rounded hover:bg-white/10"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStage(idx)}
                    className="p-1 rounded hover:bg-white/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {adding ? (
          <div className="rounded-md border bg-muted/40 p-3 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">
                Tên bước <span className="text-destructive">*</span>
              </Label>
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="VD: Tiếp cận ứng viên"
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addStage(); }
                  if (e.key === "Escape") { setAdding(false); setNewName(""); }
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addStage} disabled={!newName.trim()}>
                Thêm
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setAdding(false); setNewName(""); }}>
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
      </div>

      <aside className="w-80 shrink-0 rounded-lg border bg-muted/40 p-5 text-sm leading-relaxed text-muted-foreground space-y-2">
        <p className="font-semibold text-foreground">Chú thích</p>
        <p>
          Mỗi bước là một giai đoạn trong quy trình xử lý cơ hội tuyển dụng. Định nghĩa các bước giúp team theo dõi tiến trình từng cơ hội.
        </p>
        <p>Ví dụ:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>Bước 1 – Tiếp nhận thông tin ứng viên</li>
          <li>Bước 2 – Liên hệ &amp; sàng lọc hồ sơ</li>
          <li>Bước 3 – Phỏng vấn vòng 1</li>
          <li>Bước 4 – Phỏng vấn vòng 2 &amp; chốt offer</li>
        </ul>
        <p className="mt-1 text-xs">
          Cài đặt email tự động và thời điểm gửi được cấu hình trong phần{" "}
          <strong className="text-foreground">Automation</strong>.
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
  stages: [],
  selectedListIds: [],
};

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
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
    mutationFn: () =>
      createMktCampaign({
        name: state.name.trim(),
        description: state.description.trim() || undefined,
        fromName: state.fromName.trim(),
        fromEmail: state.fromEmail.trim(),
        replyTo: state.replyTo.trim() || undefined,
        opportunitySteps: state.stages,
      }),
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

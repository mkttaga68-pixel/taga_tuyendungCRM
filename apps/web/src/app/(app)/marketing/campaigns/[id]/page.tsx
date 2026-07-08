"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  LayoutDashboard,
  Users,
  Play,
  Pause,
} from "lucide-react";
import {
  getMktCampaign,
  listMktCampaignEnrollments,
  enrollContactsToCampaign,
  updateMktEnrollmentStep,
  activateMktCampaign,
  pauseMktCampaign,
  listMktContacts,
} from "@/lib/mkt-api";
import type { MktCampaignEnrollmentDto } from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const COLUMN_COLORS = [
  "#1a6b3c",
  "#0d5c8a",
  "#7c5c00",
  "#7a2620",
  "#4a2785",
  "#1a5f6b",
  "#3d4a00",
];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nháp",
  ACTIVE: "Đang chạy",
  PAUSED: "Tạm dừng",
  ARCHIVED: "Lưu trữ",
  COMPLETED: "Hoàn thành",
  UNSUBSCRIBED: "Đã hủy",
  FAILED: "Thất bại",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0] ?? "?").slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

function daysSince(dateStr: string) {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (d === 0) return "hôm nay";
  return `${d} ngày`;
}

function EnrollmentCard({
  enrollment,
  canMoveBack,
  canMoveForward,
  onMoveBack,
  onMoveForward,
  moving,
}: {
  enrollment: MktCampaignEnrollmentDto;
  canMoveBack: boolean;
  canMoveForward: boolean;
  onMoveBack: () => void;
  onMoveForward: () => void;
  moving: boolean;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border shadow-sm p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-[#1e3a6e] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {initials(enrollment.contactName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{enrollment.contactName}</p>
          <p className="text-xs text-muted-foreground truncate">{enrollment.contactEmail}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{daysSince(enrollment.enrolledAt)}</span>
        <div className="flex gap-1">
          <button
            disabled={!canMoveBack || moving}
            onClick={onMoveBack}
            className="h-6 w-6 rounded flex items-center justify-center border text-xs hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
            title="Lùi về bước trước"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            disabled={!canMoveForward || moving}
            onClick={onMoveForward}
            className="h-6 w-6 rounded flex items-center justify-center border text-xs hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
            title="Chuyển sang bước tiếp theo"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [movingIds, setMovingIds] = useState<Set<string>>(new Set());

  const { data: campaign, isLoading: campLoading } = useQuery({
    queryKey: ["mkt-campaign", id],
    queryFn: () => getMktCampaign(id),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["mkt-campaign-enrollments", id],
    queryFn: () => listMktCampaignEnrollments(id),
  });

  const { data: contacts } = useQuery({
    queryKey: ["mkt-contacts-for-enroll"],
    queryFn: () => listMktContacts({ limit: 500 }),
    enabled: enrollOpen,
  });

  const activateMutation = useMutation({
    mutationFn: () => activateMktCampaign(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mkt-campaign", id] });
      toast.success("Đã kích hoạt chiến dịch");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pauseMutation = useMutation({
    mutationFn: () => pauseMktCampaign(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mkt-campaign", id] });
      toast.success("Đã tạm dừng chiến dịch");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enrollMutation = useMutation({
    mutationFn: () => enrollContactsToCampaign(id, { contactIds: selectedContactIds }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["mkt-campaign-enrollments", id] });
      qc.invalidateQueries({ queryKey: ["mkt-campaign", id] });
      setEnrollOpen(false);
      setSelectedContactIds([]);
      toast.success(`Đã thêm ${res.enrolled} ứng viên`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveStepMutation = useMutation({
    mutationFn: ({ enrollmentId, step }: { enrollmentId: string; step: number }) =>
      updateMktEnrollmentStep(id, enrollmentId, step),
    onMutate: ({ enrollmentId }) => {
      setMovingIds((s) => new Set(s).add(enrollmentId));
    },
    onSettled: (_data, _err, { enrollmentId }) => {
      setMovingIds((s) => {
        const next = new Set(s);
        next.delete(enrollmentId);
        return next;
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mkt-campaign-enrollments", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (campLoading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Đang tải...
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Không tìm thấy chiến dịch
      </div>
    );
  }

  const steps = campaign.opportunitySteps;
  const enrolledContactIds = new Set(enrollments.map((e) => e.contactId));

  // Group enrollments by currentStep (clamp to valid range)
  const byStep: MktCampaignEnrollmentDto[][] = steps.map(() => []);
  for (const enrollment of enrollments) {
    const idx = steps.length > 0 ? Math.min(Math.max(enrollment.currentStep, 0), steps.length - 1) : 0;
    if (byStep[idx]) {
      byStep[idx].push(enrollment);
    }
  }

  const canActivate =
    (campaign.status === "DRAFT" || campaign.status === "PAUSED") && steps.length > 0;
  const needsSteps =
    (campaign.status === "DRAFT" || campaign.status === "PAUSED") && steps.length === 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="flex-none px-6 pt-5 pb-4 border-b space-y-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="flex-none">
            <Link href="/marketing/campaigns">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold tracking-tight truncate">{campaign.name}</h1>
              <Badge variant={campaign.status === "ACTIVE" ? "default" : "secondary"}>
                {STATUS_LABELS[campaign.status] ?? campaign.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gửi từ: {campaign.fromName} &lt;{campaign.fromEmail}&gt;
              {" · "}
              {steps.length} bước · {enrollments.length} ứng viên
            </p>
          </div>

          <div className="flex gap-2 flex-none">
            {canActivate && (
              <Button
                size="sm"
                onClick={() => activateMutation.mutate()}
                disabled={activateMutation.isPending}
              >
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Kích hoạt
              </Button>
            )}
            {needsSteps && (
              <Button size="sm" variant="outline" disabled title="Thêm ít nhất 1 bước xử lý cơ hội">
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Kích hoạt
              </Button>
            )}
            {campaign.status === "ACTIVE" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => pauseMutation.mutate()}
                disabled={pauseMutation.isPending}
              >
                <Pause className="mr-1.5 h-3.5 w-3.5" />
                Tạm dừng
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEnrollOpen(true)}
              disabled={campaign.status !== "ACTIVE"}
              title={campaign.status !== "ACTIVE" ? "Kích hoạt chiến dịch trước khi thêm ứng viên" : undefined}
            >
              <Users className="mr-1.5 h-3.5 w-3.5" />
              Thêm ứng viên
            </Button>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2">
          <div className="inline-flex border rounded-md overflow-hidden">
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${
                view === "kanban"
                  ? "bg-[#1e3a6e] text-white"
                  : "hover:bg-muted text-muted-foreground"
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors border-l ${
                view === "list"
                  ? "bg-[#1e3a6e] text-white"
                  : "hover:bg-muted text-muted-foreground"
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              Danh sách
            </button>
          </div>
        </div>
      </div>

      {/* ── Main area ── */}
      {steps.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <p className="text-base">Chiến dịch chưa có bước xử lý cơ hội nào.</p>
          <p className="text-sm">Sửa chiến dịch để thêm các bước trước khi sử dụng.</p>
        </div>
      ) : view === "kanban" ? (
        /* ── Kanban ── */
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full gap-3 p-4" style={{ width: `max(100%, ${steps.length * 296 + 32}px)` }}>
            {steps.map((stepName, colIdx) => {
              const color = COLUMN_COLORS[colIdx % COLUMN_COLORS.length] ?? "#1a6b3c";
              const colItems = byStep[colIdx] ?? [];
              return (
                <div key={colIdx} className="flex flex-col w-[280px] flex-none h-full">
                  <div
                    className="rounded-t-lg px-3 py-2.5 flex items-center gap-2"
                    style={{ backgroundColor: color }}
                  >
                    <span className="text-white text-sm font-semibold flex-1 truncate">
                      {stepName}
                    </span>
                    <span className="bg-white/25 text-white text-xs font-bold rounded-full px-2 py-0.5 tabular-nums min-w-[24px] text-center">
                      {colItems.length}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950/50 border border-t-0 rounded-b-lg p-2 space-y-2">
                    {colItems.map((enrollment) => (
                      <EnrollmentCard
                        key={enrollment.id}
                        enrollment={enrollment}
                        canMoveBack={colIdx > 0}
                        canMoveForward={colIdx < steps.length - 1}
                        moving={movingIds.has(enrollment.id)}
                        onMoveBack={() =>
                          moveStepMutation.mutate({
                            enrollmentId: enrollment.id,
                            step: colIdx - 1,
                          })
                        }
                        onMoveForward={() =>
                          moveStepMutation.mutate({
                            enrollmentId: enrollment.id,
                            step: colIdx + 1,
                          })
                        }
                      />
                    ))}
                    {colItems.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6">
                        Không có ứng viên
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── List ── */
        <div className="flex-1 overflow-auto p-4">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Ứng viên</th>
                  <th className="text-left px-4 py-2.5 font-medium">Bước hiện tại</th>
                  <th className="text-left px-4 py-2.5 font-medium">Trạng thái</th>
                  <th className="text-left px-4 py-2.5 font-medium">Đăng ký</th>
                  <th className="text-right px-4 py-2.5 font-medium">Chuyển bước</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      Chưa có ứng viên nào trong chiến dịch.
                    </td>
                  </tr>
                ) : (
                  enrollments.map((e) => {
                    const stepIdx = steps.length > 0
                      ? Math.min(Math.max(e.currentStep, 0), steps.length - 1)
                      : 0;
                    const stepName = steps[stepIdx] ?? `Bước ${stepIdx + 1}`;
                    const color = COLUMN_COLORS[stepIdx % COLUMN_COLORS.length] ?? "#1a6b3c";
                    return (
                      <tr key={e.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{e.contactName}</p>
                          <p className="text-xs text-muted-foreground">{e.contactEmail}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                            style={{ backgroundColor: color }}
                          >
                            {stepName}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge
                            variant={
                              e.status === "ACTIVE"
                                ? "default"
                                : e.status === "COMPLETED"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {STATUS_LABELS[e.status] ?? e.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">
                          {new Date(e.enrolledAt).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end gap-1">
                            <button
                              disabled={stepIdx === 0 || movingIds.has(e.id)}
                              onClick={() =>
                                moveStepMutation.mutate({
                                  enrollmentId: e.id,
                                  step: stepIdx - 1,
                                })
                              }
                              className="h-7 w-7 rounded flex items-center justify-center border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Lùi bước"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            <button
                              disabled={stepIdx >= steps.length - 1 || movingIds.has(e.id)}
                              onClick={() =>
                                moveStepMutation.mutate({
                                  enrollmentId: e.id,
                                  step: stepIdx + 1,
                                })
                              }
                              className="h-7 w-7 rounded flex items-center justify-center border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Chuyển bước"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Enroll dialog ── */}
      <Dialog open={enrollOpen} onOpenChange={(o) => !o && setEnrollOpen(false)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Thêm ứng viên vào chiến dịch</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Chọn contacts để bắt đầu từ bước đầu tiên:{" "}
            <strong>{steps[0] ?? ""}</strong>
          </p>
          <div className="space-y-1 max-h-64 overflow-y-auto border rounded-md p-2">
            {(contacts?.data ?? [])
              .filter((c) => !enrolledContactIds.has(c.id))
              .map((c) => {
                const selected = selectedContactIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`w-full text-left rounded px-2 py-1.5 text-sm flex items-center gap-2 transition-colors ${
                      selected ? "bg-primary/10" : "hover:bg-muted"
                    }`}
                    onClick={() =>
                      setSelectedContactIds((prev) =>
                        selected
                          ? prev.filter((x) => x !== c.id)
                          : [...prev, c.id],
                      )
                    }
                  >
                    <div
                      className={`h-3.5 w-3.5 rounded border flex-shrink-0 ${
                        selected
                          ? "bg-primary border-primary"
                          : "border-muted-foreground"
                      }`}
                    />
                    <span className="font-medium">{c.fullName}</span>
                    <span className="text-muted-foreground text-xs ml-auto">{c.email}</span>
                  </button>
                );
              })}
            {(contacts?.data ?? []).filter((c) => !enrolledContactIds.has(c.id)).length ===
              0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Tất cả contacts đã được enroll vào chiến dịch này.
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Đã chọn: {selectedContactIds.length} ứng viên</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollOpen(false)}>
              Hủy
            </Button>
            <Button
              disabled={selectedContactIds.length === 0 || enrollMutation.isPending}
              onClick={() => enrollMutation.mutate()}
            >
              {enrollMutation.isPending
                ? "Đang thêm..."
                : `Thêm ${selectedContactIds.length} ứng viên`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

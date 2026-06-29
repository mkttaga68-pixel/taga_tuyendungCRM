"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CANDIDATE_SOURCES,
  CANDIDATE_SOURCE_LABELS,
  GENDERS,
  GENDER_LABELS,
  type CandidateDto,
} from "@taga-crm/shared";
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
import { updateCandidateFields } from "@/lib/candidates-api";
import { listPipelineStages } from "@/lib/pipeline-stages-api";
import { lookupUsers } from "@/lib/users-lookup-api";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError } from "@/lib/api-client";

interface FormState {
  fullName: string;
  phone: string;
  email: string;
  dob: string;
  gender: string;
  address: string;
  areaBranch: string;
  facebookLink: string;
  source: string;
  statusId: string;
  recruiterId: string;
  nextActionNote: string;
  note: string;
  tags: string;
}

function toFormState(c: CandidateDto): FormState {
  return {
    fullName: c.fullName,
    phone: c.phone ?? "",
    email: c.email ?? "",
    dob: c.dob ?? "",
    gender: c.gender ?? "",
    address: c.address ?? "",
    areaBranch: c.areaBranch ?? "",
    facebookLink: c.facebookLink ?? "",
    source: c.source,
    statusId: c.status.id,
    recruiterId: c.recruiter?.id ?? "",
    nextActionNote: c.nextActionNote ?? "",
    note: c.note ?? "",
    tags: c.tags.join(", "),
  };
}

export function InfoTab({ candidate }: { candidate: CandidateDto }) {
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.role !== "VIEWER";
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => toFormState(candidate));

  const stagesQuery = useQuery({ queryKey: ["pipeline-stages"], queryFn: listPipelineStages });
  const usersQuery = useQuery({ queryKey: ["users-lookup"], queryFn: lookupUsers });

  const saveMutation = useMutation({
    mutationFn: () =>
      updateCandidateFields(candidate.id, {
        fullName: form.fullName,
        phone: form.phone || null,
        email: form.email || null,
        dob: form.dob || null,
        gender: form.gender || null,
        address: form.address || null,
        areaBranch: form.areaBranch || null,
        facebookLink: form.facebookLink || null,
        source: form.source,
        statusId: form.statusId,
        recruiterId: form.recruiterId || null,
        nextActionNote: form.nextActionNote || null,
        note: form.note || null,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.setQueryData(["candidates", "detail", candidate.id], updated);
      toast.success("Đã lưu thông tin ứng viên");
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể lưu thay đổi");
    },
  });

  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Họ và tên</Label>
          <Input
            disabled={!canEdit}
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Số điện thoại</Label>
          <Input
            disabled={!canEdit}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Email</Label>
          <Input
            disabled={!canEdit}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ngày sinh</Label>
          <Input
            type="date"
            disabled={!canEdit}
            value={form.dob}
            onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Giới tính</Label>
          <Select
            disabled={!canEdit}
            value={form.gender || "__none__"}
            onValueChange={(v) => setForm((f) => ({ ...f, gender: v === "__none__" ? "" : v }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {GENDERS.map((g) => (
                <SelectItem key={g} value={g}>
                  {GENDER_LABELS[g]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nguồn</Label>
          <Select
            disabled={!canEdit}
            value={form.source}
            onValueChange={(v) => setForm((f) => ({ ...f, source: v }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CANDIDATE_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {CANDIDATE_SOURCE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Địa chỉ</Label>
          <Input
            disabled={!canEdit}
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Khu vực</Label>
          <Input
            disabled={!canEdit}
            value={form.areaBranch}
            onChange={(e) => setForm((f) => ({ ...f, areaBranch: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Link Facebook</Label>
          <Input
            disabled={!canEdit}
            value={form.facebookLink}
            onChange={(e) => setForm((f) => ({ ...f, facebookLink: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Next Step</Label>
          <Select
            disabled={!canEdit}
            value={form.statusId}
            onValueChange={(v) => setForm((f) => ({ ...f, statusId: v }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(stagesQuery.data ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Recruiter phụ trách</Label>
          <Select
            disabled={!canEdit}
            value={form.recruiterId || "__none__"}
            onValueChange={(v) => setForm((f) => ({ ...f, recruiterId: v === "__none__" ? "" : v }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {(usersQuery.data ?? []).map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Hành động tiếp theo</Label>
          <Input
            disabled={!canEdit}
            value={form.nextActionNote}
            onChange={(e) => setForm((f) => ({ ...f, nextActionNote: e.target.value }))}
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Tags (phân tách bằng dấu phẩy)</Label>
          <Input
            disabled={!canEdit}
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Ghi chú</Label>
          <Textarea
            disabled={!canEdit}
            rows={4}
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          />
        </div>
      </div>

      {candidate.landingPage && (
        <p className="text-xs text-muted-foreground">
          Nguồn từ Landing Page: <span className="font-medium">{candidate.landingPage.name}</span>
          {candidate.firstUtmSource && ` · UTM Source: ${candidate.firstUtmSource}`}
          {candidate.firstDevice && ` · Thiết bị: ${candidate.firstDevice}`}
        </p>
      )}

      {canEdit && (
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import {
  CANDIDATE_FIELD_MAPPINGS,
  FORM_FIELD_TYPE_LABELS,
  FORM_FIELD_TYPES,
  type CandidateFieldMapping,
  type FormField,
  type FormFieldType,
  type LandingPageFormDto,
} from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createFormVersion, getActiveForm, listFormVersions } from "@/lib/landing-pages-api";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError } from "@/lib/api-client";

const NO_MAPPING = "__none__";

const CANDIDATE_FIELD_MAPPING_LABELS: Record<CandidateFieldMapping, string> = {
  fullName: "Họ và tên",
  phone: "Số điện thoại",
  email: "Email",
  dob: "Ngày sinh",
  address: "Địa chỉ",
  areaBranch: "Khu vực",
  facebookLink: "Link Facebook",
  note: "Ghi chú",
  cv: "CV (file)",
};

function emptyField(): FormField {
  return { key: "", label: "", type: "TEXT", required: false };
}

export function FormBuilderTab({ landingPageId }: { landingPageId: string }) {
  const activeFormQuery = useQuery({
    queryKey: ["landing-pages", landingPageId, "forms", "active"],
    queryFn: () => getActiveForm(landingPageId),
  });
  const versionsQuery = useQuery({
    queryKey: ["landing-pages", landingPageId, "forms"],
    queryFn: () => listFormVersions(landingPageId),
  });

  if (activeFormQuery.isLoading) {
    return <div className="pt-4 text-sm text-muted-foreground">Đang tải...</div>;
  }

  return (
    <div className="space-y-4 pt-4">
      {/* key theo version đang active — đảm bảo state local reset đúng khi đổi
          landing page / sau khi lưu version mới, không cần effect đồng bộ. */}
      <FormFieldsEditor
        key={activeFormQuery.data?.id ?? "new"}
        landingPageId={landingPageId}
        activeForm={activeFormQuery.data ?? null}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lịch sử version</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(versionsQuery.data ?? []).map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span>
                v{v.version} — {v.schema.fields.length} field —{" "}
                {new Date(v.createdAt).toLocaleString("vi-VN")}
              </span>
              {v.isActive && <Badge>Đang dùng</Badge>}
            </div>
          ))}
          {versionsQuery.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">Chưa có version nào.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FormFieldsEditor({
  landingPageId,
  activeForm,
}: {
  landingPageId: string;
  activeForm: LandingPageFormDto | null;
}) {
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === "ADMIN" || user?.role === "HR_MANAGER";
  const queryClient = useQueryClient();

  const [fields, setFields] = useState<FormField[]>(() => activeForm?.schema.fields ?? []);
  const [honeypotKey, setHoneypotKey] = useState(() => activeForm?.schema.honeypotKey ?? "website");

  const saveMutation = useMutation({
    mutationFn: () =>
      createFormVersion(landingPageId, {
        fields,
        honeypotKey: honeypotKey || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-pages", landingPageId, "forms"] });
      toast.success("Đã lưu phiên bản form mới");
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể lưu form");
    },
  });

  function updateField(index: number, patch: Partial<FormField>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function moveField(index: number, direction: -1 | 1) {
    setFields((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Field trên form public {activeForm && `(đang dùng v${activeForm.version})`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!canManage && (
          <p className="text-sm text-muted-foreground">
            Bạn chỉ có quyền xem cấu hình form — chỉ Admin/HR Manager mới sửa được.
          </p>
        )}
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">Chưa có field nào — thêm field bên dưới.</p>
        )}
        {fields.map((field, index) => (
          <div key={index} className="space-y-2 rounded-md border p-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs">Key</Label>
                <Input
                  disabled={!canManage}
                  value={field.key}
                  onChange={(e) => updateField(index, { key: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nhãn hiển thị</Label>
                <Input
                  disabled={!canManage}
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Kiểu</Label>
                <Select
                  disabled={!canManage}
                  value={field.type}
                  onValueChange={(v) => updateField(index, { type: v as FormFieldType })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORM_FIELD_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {FORM_FIELD_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Map vào field ứng viên</Label>
                <Select
                  disabled={!canManage}
                  value={field.mapsTo ?? NO_MAPPING}
                  onValueChange={(v) =>
                    updateField(index, {
                      mapsTo: v === NO_MAPPING ? undefined : (v as CandidateFieldMapping),
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_MAPPING}>Không map (custom field)</SelectItem>
                    {CANDIDATE_FIELD_MAPPINGS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {CANDIDATE_FIELD_MAPPING_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {field.type === "SELECT" && (
              <div className="space-y-1">
                <Label className="text-xs">Lựa chọn (phân tách bằng dấu phẩy)</Label>
                <Input
                  disabled={!canManage}
                  value={(field.options ?? []).join(", ")}
                  onChange={(e) =>
                    updateField(index, {
                      options: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  disabled={!canManage}
                  checked={!!field.required}
                  onCheckedChange={(checked) => updateField(index, { required: !!checked })}
                />
                <Label className="text-sm">Bắt buộc</Label>
              </div>
              {canManage && (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => moveField(index, -1)}
                    disabled={index === 0}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => moveField(index, 1)}
                    disabled={index === fields.length - 1}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeField(index)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}

        {canManage && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setFields((p) => [...p, emptyField()])}
          >
            + Thêm field
          </Button>
        )}

        {canManage && (
          <div className="space-y-1 border-t pt-3">
            <Label className="text-xs">Honeypot key (field bẫy bot, ẩn trên landing page thật)</Label>
            <Input value={honeypotKey} onChange={(e) => setHoneypotKey(e.target.value)} />
          </div>
        )}

        {canManage && (
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || fields.length === 0}>
            {saveMutation.isPending ? "Đang lưu..." : "Lưu phiên bản mới"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

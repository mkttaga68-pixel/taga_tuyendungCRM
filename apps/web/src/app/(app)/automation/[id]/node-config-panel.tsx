"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Node } from "@xyflow/react";
import {
  AUTOMATION_NODE_TYPE_LABELS,
  FILTER_OPERATOR_LABELS,
  FILTER_OPERATORS,
} from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import type { UserLookupDto } from "@/lib/users-lookup-api";
import { listEmailTemplates } from "@/lib/email-templates-api";
import { listFieldDefinitions } from "@/lib/field-definitions-api";
import { listPipelineStages } from "@/lib/pipeline-stages-api";
import type { AutomationNodeData } from "./automation-node";

// fieldKey của các cột tracking hệ thống — không cần lọc điều kiện automation
const SKIP_FIELD_KEYS = new Set([
  "firstUtmSource", "firstUtmMedium", "firstUtmCampaign", "firstUtmContent", "firstUtmTerm",
  "firstIp", "firstDevice", "firstOs", "firstBrowser", "firstReferrer",
  "landingPageId", "photoUrl", "updatedAt", "lastEmailLog",
]);

const RECRUITER_SENTINEL = "__recruiter__";
const CUSTOM_EMAIL_CONTENT_SENTINEL = "__custom__";

interface Props {
  node: Node<AutomationNodeData>;
  users: UserLookupDto[];
  onChangeConfig: (config: Record<string, unknown>) => void;
  onToggleEntry: (isEntry: boolean) => void;
  onDelete: () => void;
  onSave: () => void;
  isSaving: boolean;
}

function FieldsListEditor({
  fields,
  onChange,
}: {
  fields: Record<string, unknown>;
  onChange: (fields: Record<string, unknown>) => void;
}) {
  const entries = Object.entries(fields);
  return (
    <div className="space-y-2">
      {entries.map(([key, value], index) => (
        <div key={index} className="flex gap-1">
          <Input
            placeholder="fieldKey"
            value={key}
            onChange={(e) => {
              const next = { ...fields };
              delete next[key];
              next[e.target.value] = value;
              onChange(next);
            }}
          />
          <Input
            placeholder="value (hỗ trợ {{candidate.x}})"
            value={String(value ?? "")}
            onChange={(e) => onChange({ ...fields, [key]: e.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              const next = { ...fields };
              delete next[key];
              onChange(next);
            }}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...fields, "": "" })}>
        + Thêm field
      </Button>
    </div>
  );
}

export function NodeConfigPanel({ node, users, onChangeConfig, onToggleEntry, onDelete, onSave, isSaving }: Props) {
  const { type, config, isEntry } = node.data;
  const [localConfig, setLocalConfig] = useState(config);
  const isIfNode = type === "IF" || type === "CONDITION";
  const emailTemplatesQuery = useQuery({
    queryKey: ["email-templates"],
    queryFn: listEmailTemplates,
    enabled: type === "EMAIL",
  });
  const fieldDefsQuery = useQuery({
    queryKey: ["field-definitions", "candidates"],
    queryFn: () => listFieldDefinitions("candidates"),
    enabled: isIfNode,
    staleTime: 60_000,
  });
  const pipelineStagesQuery = useQuery({
    queryKey: ["pipeline-stages"],
    queryFn: listPipelineStages,
    enabled: isIfNode,
    staleTime: 60_000,
  });

  function patch(partial: Record<string, unknown>) {
    const next = { ...localConfig, ...partial };
    setLocalConfig(next);
    onChangeConfig(next);
  }

  return (
    <div className="flex h-full w-80 flex-col gap-3 overflow-y-auto border-l p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{AUTOMATION_NODE_TYPE_LABELS[type]}</h3>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
      <p className="font-mono text-xs text-muted-foreground">key: {node.id}</p>

      <div className="flex items-center gap-2">
        <Checkbox checked={!!isEntry} onCheckedChange={(c) => onToggleEntry(!!c)} />
        <Label className="text-sm">Node bắt đầu (entry)</Label>
      </div>

      {(type === "GOOGLE_CALENDAR" || type === "GOOGLE_MEET") && (
        <p className="rounded-md bg-blue-50 p-2 text-xs text-blue-700">
          Event được tạo trên lịch Google của Recruiter đang được gán cho ứng viên — Recruiter đó
          cần đã kết nối Google ở Cài đặt &gt; Tích hợp, nếu chưa thì node sẽ báo lỗi khi chạy.
        </p>
      )}

      {(type === "IF" || type === "CONDITION") && (() => {
        // Hỗ trợ cả format cũ (condition đơn) lẫn format mới (conditionGroup)
        const rawGroup = localConfig.conditionGroup as { logic: string; conditions: unknown[] } | undefined;
        const rawLegacy = localConfig.condition as Record<string, unknown> | undefined;
        const group = rawGroup ?? (rawLegacy
          ? { logic: "AND", conditions: [rawLegacy] }
          : { logic: "AND", conditions: [{ fieldKey: "", operator: "equals", value: "" }] }
        );
        const logic = String(group.logic ?? "AND") as "AND" | "OR";
        const conditions = (group.conditions ?? []) as Array<Record<string, unknown>>;

        const availableFields = (fieldDefsQuery.data ?? []).filter(
          (fd) => !SKIP_FIELD_KEYS.has(fd.fieldKey),
        );

        function saveGroup(updated: { logic: "AND" | "OR"; conditions: Array<Record<string, unknown>> }) {
          // Lưu sang conditionGroup, xoá condition cũ (legacy)
          const { condition: _removed, ...rest } = localConfig as Record<string, unknown> & { condition?: unknown };
          const next = { ...rest, conditionGroup: updated };
          setLocalConfig(next);
          onChangeConfig(next);
        }

        function updateCondition(idx: number, partial: Record<string, unknown>) {
          const updated = conditions.map((c, i) => (i === idx ? { ...c, ...partial } : c));
          saveGroup({ logic, conditions: updated });
        }

        function addCondition() {
          saveGroup({ logic, conditions: [...conditions, { fieldKey: "", operator: "equals", value: "" }] });
        }

        function removeCondition(idx: number) {
          if (conditions.length <= 1) return;
          saveGroup({ logic, conditions: conditions.filter((_, i) => i !== idx) });
        }

        function renderValueInput(cond: Record<string, unknown>, idx: number) {
          const fieldKey = String(cond.fieldKey ?? "");
          const operator = String(cond.operator ?? "");
          const value = String(cond.value ?? "");
          if (["is_empty", "is_not_empty"].includes(operator)) return null;

          const fieldDef = availableFields.find((fd) => fd.fieldKey === fieldKey);
          const isNextStep = fieldKey === "statusLabel";
          const isSelect = fieldDef?.fieldType === "SELECT" || fieldDef?.fieldType === "MULTI_SELECT";
          const choices = isSelect && fieldDef?.options
            ? ((fieldDef.options as Record<string, unknown>).choices as Array<{ value: string; label: string }> | undefined) ?? []
            : [];

          if (isNextStep) {
            return (
              <Select value={value} onValueChange={(v) => updateCondition(idx, { value: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn Next Step..." />
                </SelectTrigger>
                <SelectContent>
                  {(pipelineStagesQuery.data ?? []).map((stage) => (
                    <SelectItem key={stage.key} value={stage.label}>{stage.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }
          if (isSelect && choices.length > 0) {
            return (
              <Select value={value} onValueChange={(v) => updateCondition(idx, { value: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn giá trị..." />
                </SelectTrigger>
                <SelectContent>
                  {choices.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }
          return (
            <Input
              placeholder="Nhập giá trị..."
              value={value}
              onChange={(e) => updateCondition(idx, { value: e.target.value })}
            />
          );
        }

        return (
          <>
            {/* AND / OR toggle */}
            <div className="flex items-center gap-2">
              <Label className="text-xs shrink-0">Thỏa mãn</Label>
              <Select value={logic} onValueChange={(v) => saveGroup({ logic: v as "AND" | "OR", conditions })}>
                <SelectTrigger className="h-7 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">Tất cả điều kiện</SelectItem>
                  <SelectItem value="OR">Ít nhất 1 điều kiện</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Danh sách điều kiện */}
            {conditions.map((cond, idx) => (
              <div key={idx} className="rounded-md border p-2 space-y-1.5 relative">
                {conditions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCondition(idx)}
                    className="absolute top-1.5 right-1.5 rounded p-0.5 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
                <p className="text-[11px] font-medium text-muted-foreground">Điều kiện {idx + 1}</p>

                <Select
                  value={String(cond.fieldKey ?? "")}
                  onValueChange={(v) => updateCondition(idx, { fieldKey: v, value: "" })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn field..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="statusLabel">Next Step (nhãn)</SelectItem>
                    {availableFields
                      .filter((fd) => fd.fieldKey !== "statusId")
                      .map((fd) => (
                        <SelectItem key={fd.fieldKey} value={fd.fieldKey}>{fd.label}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                <Select
                  value={String(cond.operator ?? "")}
                  onValueChange={(v) => updateCondition(idx, { operator: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn điều kiện..." />
                  </SelectTrigger>
                  <SelectContent>
                    {FILTER_OPERATORS.map((op) => (
                      <SelectItem key={op} value={op}>{FILTER_OPERATOR_LABELS[op]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {renderValueInput(cond, idx)}
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" className="w-full" onClick={addCondition}>
              + Thêm điều kiện
            </Button>

            <p className="text-xs text-muted-foreground">
              Nối 2 cạnh ra từ node này: gắn label <strong>true</strong> và <strong>false</strong>.
            </p>
          </>
        );
      })()}

      {type === "SWITCH" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Field cần so khớp</Label>
            <Input
              value={String(localConfig.fieldKey ?? "")}
              onChange={(e) => patch({ fieldKey: e.target.value })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Mỗi cạnh ra gắn label = giá trị cần khớp; 1 cạnh có thể gắn label &quot;default&quot;.
          </p>
        </>
      )}

      {type === "LOOP" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Custom field chứa danh sách (array)</Label>
            <Input
              value={String(localConfig.sourceFieldKey ?? "")}
              onChange={(e) => patch({ sourceFieldKey: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Số lần lặp tối đa</Label>
            <Input
              type="number"
              value={String(localConfig.maxIterations ?? 50)}
              onChange={(e) => patch({ maxIterations: Number(e.target.value) })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Nối cạnh &quot;body&quot; tới node lặp mỗi vòng, &quot;done&quot; tới node chạy sau khi hết.
            Trong thân loop dùng {"{{loopItem}}"}.
          </p>
        </>
      )}

      {type === "DELAY" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Số lượng</Label>
            <Input
              type="number"
              value={String(localConfig.amount ?? 1)}
              onChange={(e) => patch({ amount: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Đơn vị</Label>
            <Select
              value={String(localConfig.unit ?? "minutes")}
              onValueChange={(v) => patch({ unit: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="seconds">Giây</SelectItem>
                <SelectItem value="minutes">Phút</SelectItem>
                <SelectItem value="hours">Giờ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {type === "WAIT" && (
        <div className="space-y-1">
          <Label className="text-xs">Đợi đến thời điểm</Label>
          <Input
            type="datetime-local"
            value={String(localConfig.untilDateTime ?? "").slice(0, 16)}
            onChange={(e) => patch({ untilDateTime: new Date(e.target.value).toISOString() })}
          />
        </div>
      )}

      {type === "WEBHOOK" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">URL</Label>
            <Input value={String(localConfig.url ?? "")} onChange={(e) => patch({ url: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Method</Label>
            <Select value={String(localConfig.method ?? "POST")} onValueChange={(v) => patch({ method: v })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Body (JSON template)</Label>
            <Textarea
              rows={4}
              value={String(localConfig.bodyTemplate ?? "")}
              onChange={(e) => patch({ bodyTemplate: e.target.value })}
            />
          </div>
        </>
      )}

      {type === "NOTIFICATION" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Người nhận</Label>
            <Select
              value={String(localConfig.targetUserId ?? "")}
              onValueChange={(v) => patch({ targetUserId: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn người nhận" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={RECRUITER_SENTINEL}>Recruiter của ứng viên</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tiêu đề</Label>
            <Input value={String(localConfig.title ?? "")} onChange={(e) => patch({ title: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nội dung</Label>
            <Textarea
              rows={3}
              value={String(localConfig.bodyTemplate ?? "")}
              onChange={(e) => patch({ bodyTemplate: e.target.value })}
            />
          </div>
        </>
      )}

      {(type === "UPDATE_RECORD" || type === "CREATE_RECORD") && (
        <>
          <Label className="text-xs">
            Fields {type === "CREATE_RECORD" && "(bắt buộc có fullName)"}
          </Label>
          <FieldsListEditor
            fields={(localConfig.fields as Record<string, unknown>) ?? {}}
            onChange={(fields) => patch({ fields })}
          />
        </>
      )}

      {type === "DELETE_RECORD" && (
        <p className="text-xs text-muted-foreground">
          Xoá (soft-delete) ứng viên đang trigger workflow này — không cần cấu hình thêm.
        </p>
      )}

      {type === "FUNCTION" && (
        <div className="space-y-1">
          <Label className="text-xs">
            Code JS — nhận <code>context</code> (candidate/vars/loopItem), có thể return giá trị hoặc
            ghi context.vars
          </Label>
          <Textarea
            rows={8}
            className="font-mono text-xs"
            value={String(localConfig.code ?? "")}
            onChange={(e) => patch({ code: e.target.value })}
          />
        </div>
      )}

      {type === "EMAIL" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Gửi tới (email người nhận)</Label>
            <Input
              placeholder="{{candidate.email}}"
              value={String(localConfig.to ?? "")}
              onChange={(e) => patch({ to: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">
              Dùng <code className="rounded bg-muted px-1">{"{{candidate.email}}"}</code> để gửi tới email ứng viên.
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Nội dung</Label>
            <Select
              value={String(localConfig.templateId ?? CUSTOM_EMAIL_CONTENT_SENTINEL)}
              onValueChange={(v) =>
                patch({ templateId: v === CUSTOM_EMAIL_CONTENT_SENTINEL ? undefined : v })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CUSTOM_EMAIL_CONTENT_SENTINEL}>Tự nhập chủ đề + nội dung</SelectItem>
                {(emailTemplatesQuery.data ?? []).map((tpl) => (
                  <SelectItem key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {localConfig.templateId ? (
            <Input
              placeholder="Chủ đề (để trống = dùng chủ đề của mẫu)"
              value={String(localConfig.subject ?? "")}
              onChange={(e) => patch({ subject: e.target.value || undefined })}
            />
          ) : (
            <>
              <Input
                placeholder="Subject"
                value={String(localConfig.subject ?? "")}
                onChange={(e) => patch({ subject: e.target.value })}
              />
              <Textarea
                placeholder="Body"
                rows={4}
                value={String(localConfig.bodyTemplate ?? "")}
                onChange={(e) => patch({ bodyTemplate: e.target.value })}
              />
            </>
          )}
        </>
      )}

      {type === "SMS" && (
        <>
          <Input
            placeholder="To"
            value={String(localConfig.to ?? "")}
            onChange={(e) => patch({ to: e.target.value })}
          />
          <Textarea
            placeholder="Message"
            rows={3}
            value={String(localConfig.messageTemplate ?? "")}
            onChange={(e) => patch({ messageTemplate: e.target.value })}
          />
        </>
      )}

      {type === "TELEGRAM" && (
        <>
          <Input
            placeholder="Bot token"
            value={String(localConfig.botToken ?? "")}
            onChange={(e) => patch({ botToken: e.target.value })}
          />
          <Input
            placeholder="Chat ID"
            value={String(localConfig.chatId ?? "")}
            onChange={(e) => patch({ chatId: e.target.value })}
          />
          <Textarea
            placeholder="Message"
            rows={3}
            value={String(localConfig.messageTemplate ?? "")}
            onChange={(e) => patch({ messageTemplate: e.target.value })}
          />
        </>
      )}

      {type === "SLACK" && (
        <>
          <Input
            placeholder="Webhook URL"
            value={String(localConfig.webhookUrl ?? "")}
            onChange={(e) => patch({ webhookUrl: e.target.value })}
          />
          <Textarea
            placeholder="Message"
            rows={3}
            value={String(localConfig.messageTemplate ?? "")}
            onChange={(e) => patch({ messageTemplate: e.target.value })}
          />
        </>
      )}

      {(type === "GOOGLE_CALENDAR" || type === "GOOGLE_MEET") && (
        <>
          <Input
            placeholder="Summary"
            value={String(localConfig.summary ?? "")}
            onChange={(e) => patch({ summary: e.target.value })}
          />
          <Input
            type="datetime-local"
            value={String(localConfig.startDateTime ?? "").slice(0, 16)}
            onChange={(e) => patch({ startDateTime: new Date(e.target.value).toISOString() })}
          />
          <Input
            type="number"
            placeholder="Thời lượng (phút)"
            value={String(localConfig.durationMinutes ?? 30)}
            onChange={(e) => patch({ durationMinutes: Number(e.target.value) })}
          />
        </>
      )}

      {type === "ELSE" && (
        <p className="text-xs text-muted-foreground">Node placeholder — không cần cấu hình.</p>
      )}

      <Button
        type="button"
        size="sm"
        className="w-full mt-2"
        onClick={onSave}
        disabled={isSaving}
      >
        {isSaving ? "Đang lưu..." : "Lưu"}
      </Button>
    </div>
  );
}

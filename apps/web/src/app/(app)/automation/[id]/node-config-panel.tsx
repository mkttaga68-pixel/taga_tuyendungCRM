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
import type { AutomationNodeData } from "./automation-node";

const RECRUITER_SENTINEL = "__recruiter__";
const CUSTOM_EMAIL_CONTENT_SENTINEL = "__custom__";

interface Props {
  node: Node<AutomationNodeData>;
  users: UserLookupDto[];
  onChangeConfig: (config: Record<string, unknown>) => void;
  onToggleEntry: (isEntry: boolean) => void;
  onDelete: () => void;
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

export function NodeConfigPanel({ node, users, onChangeConfig, onToggleEntry, onDelete }: Props) {
  const { type, config, isEntry } = node.data;
  const [localConfig, setLocalConfig] = useState(config);
  const emailTemplatesQuery = useQuery({
    queryKey: ["email-templates"],
    queryFn: listEmailTemplates,
    enabled: type === "EMAIL",
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

      {(type === "IF" || type === "CONDITION") && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Field</Label>
            <Input
              value={String((localConfig.condition as Record<string, unknown> | undefined)?.fieldKey ?? "")}
              onChange={(e) => {
                const condition = (localConfig.condition as Record<string, unknown>) ?? {};
                patch({ condition: { ...condition, fieldKey: e.target.value } });
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Operator</Label>
            <Select
              value={String((localConfig.condition as Record<string, unknown> | undefined)?.operator ?? "")}
              onValueChange={(v) => {
                const condition = (localConfig.condition as Record<string, unknown>) ?? {};
                patch({ condition: { ...condition, operator: v } });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn operator" />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPERATORS.map((op) => (
                  <SelectItem key={op} value={op}>
                    {FILTER_OPERATOR_LABELS[op]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Giá trị so sánh</Label>
            <Input
              value={String((localConfig.condition as Record<string, unknown> | undefined)?.value ?? "")}
              onChange={(e) => {
                const condition = (localConfig.condition as Record<string, unknown>) ?? {};
                patch({ condition: { ...condition, value: e.target.value } });
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Nối 2 cạnh ra: gắn label &quot;true&quot; và &quot;false&quot;.
          </p>
        </>
      )}

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
    </div>
  );
}

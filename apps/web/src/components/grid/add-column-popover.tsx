"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  COMPUTED_FIELD_TYPES,
  CREATABLE_CUSTOM_FIELD_TYPES,
  FIELD_TYPE_LABELS,
  ROLLUP_AGGREGATIONS,
  type FieldDefinitionDto,
  type RollupAggregation,
} from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CreatableType = (typeof CREATABLE_CUSTOM_FIELD_TYPES)[number];

interface AddColumnPopoverProps {
  existingFields: FieldDefinitionDto[];
  onCreate: (input: {
    label: string;
    fieldKey: string;
    fieldType: CreatableType;
    options?: Record<string, unknown>;
  }) => void;
}

function toFieldKey(label: string): string {
  const ascii = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return ascii ? `c_${ascii}` : `c_field_${Date.now()}`;
}

export function AddColumnPopover({ existingFields, onCreate }: AddColumnPopoverProps) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<CreatableType>("TEXT");
  const [relationFieldKey, setRelationFieldKey] = useState("");
  const [targetFieldKey, setTargetFieldKey] = useState("");
  const [aggregation, setAggregation] = useState<RollupAggregation>("SUM");
  const [expression, setExpression] = useState("");

  const relationFields = existingFields.filter((f) => f.fieldType === "RELATION");
  const lookupableFields = existingFields.filter((f) => !COMPUTED_FIELD_TYPES.has(f.fieldType));
  const formulaRefFields = existingFields.filter((f) => !COMPUTED_FIELD_TYPES.has(f.fieldType));

  function reset() {
    setLabel("");
    setFieldType("TEXT");
    setRelationFieldKey("");
    setTargetFieldKey("");
    setAggregation("SUM");
    setExpression("");
  }

  function handleSubmit() {
    const trimmed = label.trim();
    if (!trimmed) return;

    let options: Record<string, unknown> | undefined;
    if (fieldType === "RELATION") {
      options = { toTableKey: "candidates" };
    } else if (fieldType === "LOOKUP") {
      if (!relationFieldKey || !targetFieldKey) return;
      options = { relationFieldKey, targetFieldKey };
    } else if (fieldType === "ROLLUP") {
      if (!relationFieldKey || !targetFieldKey) return;
      options = { relationFieldKey, targetFieldKey, aggregation };
    } else if (fieldType === "FORMULA") {
      if (!expression.trim()) return;
      options = { expression: expression.trim() };
    }

    onCreate({ label: trimmed, fieldKey: toFieldKey(trimmed), fieldType, options });
    reset();
    setOpen(false);
  }

  const canSubmit =
    !!label.trim() &&
    (fieldType !== "LOOKUP" && fieldType !== "ROLLUP" ? true : !!relationFieldKey && !!targetFieldKey) &&
    (fieldType !== "FORMULA" || !!expression.trim());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex h-8 w-10 shrink-0 items-center justify-center border-b text-muted-foreground hover:bg-muted/60">
          <Plus className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="new-field-label">Tên trường</Label>
          <Input
            id="new-field-label"
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canSubmit && handleSubmit()}
            placeholder="VD: Mức lương mong muốn"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Kiểu dữ liệu</Label>
          <Select value={fieldType} onValueChange={(v) => setFieldType(v as CreatableType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CREATABLE_CUSTOM_FIELD_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {FIELD_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {fieldType === "RELATION" && (
          <p className="text-xs text-muted-foreground">
            Liên kết tới ứng viên khác (cùng bảng Ứng viên) — sửa liên kết bằng cách bấm vào ô.
          </p>
        )}

        {(fieldType === "LOOKUP" || fieldType === "ROLLUP") && (
          <>
            <div className="space-y-1.5">
              <Label>Field Relation dùng để đi tới</Label>
              <Select value={relationFieldKey} onValueChange={setRelationFieldKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn field Relation" />
                </SelectTrigger>
                <SelectContent>
                  {relationFields.map((f) => (
                    <SelectItem key={f.fieldKey} value={f.fieldKey}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {relationFields.length === 0 && (
                <p className="text-xs text-amber-600">Cần tạo 1 field kiểu Relation trước.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Field muốn hiển thị (trên ứng viên được liên kết)</Label>
              <Select value={targetFieldKey} onValueChange={setTargetFieldKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn field" />
                </SelectTrigger>
                <SelectContent>
                  {lookupableFields.map((f) => (
                    <SelectItem key={f.fieldKey} value={f.fieldKey}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {fieldType === "ROLLUP" && (
          <div className="space-y-1.5">
            <Label>Cách tổng hợp</Label>
            <Select value={aggregation} onValueChange={(v) => setAggregation(v as RollupAggregation)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLLUP_AGGREGATIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {fieldType === "FORMULA" && (
          <div className="space-y-1.5">
            <Label>Công thức</Label>
            <Textarea
              rows={3}
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="VD: ROUND({{salary}} * 12, 0)"
            />
            <p className="text-xs text-muted-foreground">
              Field có thể dùng:{" "}
              {formulaRefFields.length > 0
                ? formulaRefFields.map((f) => `{{${f.fieldKey}}}`).join(", ")
                : "(chưa có field nào khác)"}
            </p>
          </div>
        )}

        <Button className="w-full" size="sm" onClick={handleSubmit} disabled={!canSubmit}>
          Thêm trường
        </Button>
      </PopoverContent>
    </Popover>
  );
}

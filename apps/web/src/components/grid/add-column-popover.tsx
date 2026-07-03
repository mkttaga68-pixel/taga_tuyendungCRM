"use client";

import { useState } from "react";
import {
  AlignLeft,
  AlignJustify,
  Hash,
  Phone,
  Mail,
  Calendar,
  CalendarClock,
  CheckSquare,
  ChevronDown,
  ListChecks,
  Image,
  Paperclip,
  Link,
  Calculator,
  Search,
  GitBranch,
  BarChart2,
  Star,
  DollarSign,
  Percent,
  Clock,
  RefreshCw,
  ListOrdered,
  User,
  Plus,
  X,
} from "lucide-react";
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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type LucideIcon = React.ComponentType<{ className?: string }>;

const CHOICE_COLORS = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E",
  "#14B8A6", "#3B82F6", "#8B5CF6", "#EC4899",
  "#6B7280", "#D97706", "#10B981", "#6366F1",
];

type SelectChoice = { label: string; color: string };

const FIELD_TYPE_ICON: Record<string, LucideIcon> = {
  TEXT: AlignLeft,
  LONG_TEXT: AlignJustify,
  NUMBER: Hash,
  PHONE: Phone,
  EMAIL: Mail,
  DATE: Calendar,
  DATETIME: CalendarClock,
  CHECKBOX: CheckSquare,
  SELECT: ChevronDown,
  MULTI_SELECT: ListChecks,
  IMAGE: Image,
  ATTACHMENT: Paperclip,
  LINK: Link,
  FORMULA: Calculator,
  LOOKUP: Search,
  RELATION: GitBranch,
  ROLLUP: BarChart2,
  RATING: Star,
  CURRENCY: DollarSign,
  PERCENT: Percent,
  CREATED_TIME: Clock,
  UPDATED_TIME: RefreshCw,
  AUTO_NUMBER: ListOrdered,
  USER: User,
};

type FieldGroup = { label: string; types: CreatableType[] };

const FIELD_GROUPS: FieldGroup[] = [
  {
    label: "Cơ bản",
    types: ["TEXT", "LONG_TEXT", "NUMBER", "DATE", "DATETIME", "CHECKBOX", "SELECT", "MULTI_SELECT"],
  },
  {
    label: "Liên hệ & Media",
    types: ["PHONE", "EMAIL", "LINK", "USER"],
  },
  {
    label: "Nâng cao",
    types: ["CURRENCY", "PERCENT", "RATING"],
  },
  {
    label: "Tính toán",
    types: ["FORMULA", "RELATION", "LOOKUP", "ROLLUP"],
  },
];

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

export function AddColumnPopover({ existingFields, onCreate, open: controlledOpen, onOpenChange }: AddColumnPopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;

  function setOpen(v: boolean) {
    setInternalOpen(v);
    onOpenChange?.(v);
  }
  const [step, setStep] = useState<"pick" | "config">("pick");
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<CreatableType>("TEXT");
  const [relationFieldKey, setRelationFieldKey] = useState("");
  const [targetFieldKey, setTargetFieldKey] = useState("");
  const [aggregation, setAggregation] = useState<RollupAggregation>("SUM");
  const [expression, setExpression] = useState("");
  const [selectOptions, setSelectOptions] = useState<SelectChoice[]>([]);
  const [selectOptionInput, setSelectOptionInput] = useState("");

  const relationFields = existingFields.filter((f) => f.fieldType === "RELATION");
  const lookupableFields = existingFields.filter((f) => !COMPUTED_FIELD_TYPES.has(f.fieldType));

  function reset() {
    setLabel("");
    setFieldType("TEXT");
    setRelationFieldKey("");
    setTargetFieldKey("");
    setAggregation("SUM");
    setExpression("");
    setSelectOptions([]);
    setSelectOptionInput("");
    setStep("pick");
  }

  function addSelectOption() {
    const v = selectOptionInput.trim();
    if (!v || selectOptions.some((o) => o.label === v)) return;
    const color = CHOICE_COLORS[selectOptions.length % CHOICE_COLORS.length];
    setSelectOptions((o) => [...o, { label: v, color }]);
    setSelectOptionInput("");
  }

  function pickType(type: CreatableType) {
    setFieldType(type);
    setStep("config");
  }

  function handleSubmit() {
    const trimmed = label.trim();
    if (!trimmed) return;

    let options: Record<string, unknown> | undefined;
    if (fieldType === "SELECT" || fieldType === "MULTI_SELECT") {
      options = {
        choices: selectOptions.map((o) => ({
          value: o.label.toLowerCase().trim().replace(/\s+/g, "_"),
          label: o.label,
          color: o.color,
        })),
      };
    } else if (fieldType === "RELATION") {
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

  const SelectedIcon = FIELD_TYPE_ICON[fieldType] ?? AlignLeft;

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <PopoverTrigger asChild>
        <button className="flex h-8 w-10 shrink-0 items-center justify-center border-b text-muted-foreground hover:bg-muted/60">
          <Plus className="size-4" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-72 p-0 overflow-hidden">
        {step === "pick" ? (
          /* ── Bước 1: chọn kiểu trường ── */
          <div>
            <div className="px-3 pt-3 pb-2 border-b">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Chọn kiểu dữ liệu
              </p>
            </div>
            <div className="max-h-80 overflow-y-auto py-1">
              {FIELD_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="px-3 pt-2 pb-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </p>
                  {group.types.map((type) => {
                    const Icon = FIELD_TYPE_ICON[type] ?? AlignLeft;
                    return (
                      <button
                        key={type}
                        type="button"
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-muted/60 transition-colors"
                        onClick={() => pickType(type)}
                      >
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <span>{FIELD_TYPE_LABELS[type]}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Bước 2: nhập tên & config ── */
          <div className="p-3 space-y-3">
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setStep("pick")}
            >
              ← Đổi kiểu
            </button>

            {/* Kiểu đã chọn */}
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1.5">
              <SelectedIcon className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">{FIELD_TYPE_LABELS[fieldType]}</span>
            </div>

            {/* Tên trường */}
            <div className="space-y-1.5">
              <Label htmlFor="new-field-label">Tên trường</Label>
              <Input
                id="new-field-label"
                autoFocus
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canSubmit && handleSubmit()}
                placeholder={`VD: ${FIELD_TYPE_LABELS[fieldType]}`}
              />
            </div>

            {/* Config nâng cao theo từng type */}
            {(fieldType === "SELECT" || fieldType === "MULTI_SELECT") && (
              <div className="space-y-1.5">
                <Label>
                  Các lựa chọn
                  {selectOptions.length > 0 && (
                    <span className="ml-1 text-xs text-muted-foreground">({selectOptions.length})</span>
                  )}
                </Label>
                <div className="flex gap-1">
                  <Input
                    className="h-7 text-xs"
                    placeholder="Nhập lựa chọn..."
                    value={selectOptionInput}
                    onChange={(e) => setSelectOptionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); addSelectOption(); }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addSelectOption}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-muted hover:bg-muted/60"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                {selectOptions.length > 0 && (
                  <div className="flex flex-col gap-1 pt-0.5">
                    {selectOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        {/* color picker — click để cycle qua bảng màu */}
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            title="Đổi màu"
                            onClick={() =>
                              setSelectOptions((prev) =>
                                prev.map((o, i) =>
                                  i === idx
                                    ? {
                                        ...o,
                                        color:
                                          CHOICE_COLORS[
                                            (CHOICE_COLORS.indexOf(o.color) + 1) %
                                              CHOICE_COLORS.length
                                          ],
                                      }
                                    : o,
                                ),
                              )
                            }
                            className="size-4 rounded-full border border-white/50 shadow-sm"
                            style={{ backgroundColor: opt.color }}
                          />
                        </div>
                        <span
                          className="flex-1 truncate rounded-md px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: `${opt.color}26`, color: opt.color }}
                        >
                          {opt.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectOptions((o) => o.filter((_, i) => i !== idx))}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {fieldType === "RELATION" && (
              <p className="text-xs text-muted-foreground">
                Liên kết tới bản ghi trong bảng khác — sửa liên kết bằng cách bấm vào ô.
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
                    <p className="text-xs text-amber-600">Cần tạo 1 field kiểu "Liên kết bảng" trước.</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Field muốn tra cứu</Label>
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
                      <SelectItem key={a} value={a}>{a}</SelectItem>
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
                  {lookupableFields.length > 0
                    ? `Field dùng được: ${lookupableFields.map((f) => `{{${f.fieldKey}}}`).join(", ")}`
                    : "Chưa có field nào để tham chiếu."}
                </p>
              </div>
            )}

            <Button className="w-full" size="sm" onClick={handleSubmit} disabled={!canSubmit}>
              Thêm trường
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

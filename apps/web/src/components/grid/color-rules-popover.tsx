"use client";

import { Paintbrush, Plus, X } from "lucide-react";
import {
  FIELD_TYPE_OPERATORS,
  FILTER_OPERATOR_LABELS,
  FILTERABLE_FIELD_TYPES,
  type ColorRule,
  type FieldDefinitionDto,
  type FilterOperator,
} from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PipelineStageDto } from "@/lib/pipeline-stages-api";
import type { UserLookupDto } from "@/lib/users-lookup-api";
import { FilterValueInput } from "./filter-value-input";

export const ROW_COLOR_PALETTE = [
  "#FCA5A5",
  "#FDBA74",
  "#FDE047",
  "#86EFAC",
  "#67E8F9",
  "#93C5FD",
  "#C4B5FD",
  "#F0ABFC",
];

interface ColorRulesPopoverProps {
  fields: FieldDefinitionDto[];
  colorRules: ColorRule[];
  onChange: (rules: ColorRule[]) => void;
  pipelineStages: PipelineStageDto[];
  users: UserLookupDto[];
}

export function ColorRulesPopover({
  fields,
  colorRules,
  onChange,
  pipelineStages,
  users,
}: ColorRulesPopoverProps) {
  const filterableFields = fields.filter((f) => FILTERABLE_FIELD_TYPES.has(f.fieldType));

  function updateRule(index: number, patch: Partial<ColorRule>) {
    onChange(colorRules.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRule(index: number) {
    onChange(colorRules.filter((_, i) => i !== index));
  }

  function addRule() {
    const firstField = filterableFields[0];
    if (!firstField) return;
    const operator = FIELD_TYPE_OPERATORS[firstField.fieldType][0];
    if (!operator) return;
    onChange([
      ...colorRules,
      {
        id: crypto.randomUUID(),
        filters: [{ fieldKey: firstField.fieldKey, operator, value: undefined }],
        color: ROW_COLOR_PALETTE[colorRules.length % ROW_COLOR_PALETTE.length]!,
      },
    ]);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant={colorRules.length > 0 ? "secondary" : "ghost"} className="gap-1.5">
          <Paintbrush className="size-4" />
          Tô màu {colorRules.length > 0 ? `(${colorRules.length})` : ""}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto min-w-[460px] space-y-2 p-3">
        {colorRules.length === 0 && (
          <p className="px-1 text-sm text-muted-foreground">Chưa có quy tắc tô màu nào.</p>
        )}
        {colorRules.map((rule, index) => {
          const condition = rule.filters[0]!;
          const field = filterableFields.find((f) => f.fieldKey === condition.fieldKey);
          const operators = field ? FIELD_TYPE_OPERATORS[field.fieldType] : [];
          return (
            <div key={rule.id} className="flex items-center gap-1.5">
              <div className="flex shrink-0 gap-1">
                {ROW_COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    className="size-5 rounded-full ring-offset-1"
                    style={{
                      backgroundColor: color,
                      outline: rule.color === color ? "2px solid black" : "none",
                    }}
                    onClick={() => updateRule(index, { color })}
                    aria-label={`Chọn màu ${color}`}
                  />
                ))}
              </div>

              <Select
                value={condition.fieldKey}
                onValueChange={(v) => {
                  const f = filterableFields.find((ff) => ff.fieldKey === v);
                  const op = f ? FIELD_TYPE_OPERATORS[f.fieldType][0] : undefined;
                  if (!op) return;
                  updateRule(index, { filters: [{ fieldKey: v, operator: op, value: undefined }] });
                }}
              >
                <SelectTrigger className="h-8 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filterableFields.map((f) => (
                    <SelectItem key={f.fieldKey} value={f.fieldKey}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={condition.operator}
                onValueChange={(v) =>
                  updateRule(index, {
                    filters: [{ ...condition, operator: v as FilterOperator, value: undefined }],
                  })
                }
              >
                <SelectTrigger className="h-8 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((op) => (
                    <SelectItem key={op} value={op}>
                      {FILTER_OPERATOR_LABELS[op]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {field && (
                <FilterValueInput
                  field={field}
                  condition={condition}
                  onChange={(value) => updateRule(index, { filters: [{ ...condition, value }] })}
                  pipelineStages={pipelineStages}
                  users={users}
                />
              )}

              <Button
                size="icon"
                variant="ghost"
                className="size-8 shrink-0"
                onClick={() => removeRule(index)}
                aria-label="Xoá quy tắc"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          );
        })}
        <Button size="sm" variant="ghost" className="gap-1.5" onClick={addRule}>
          <Plus className="size-4" />
          Thêm quy tắc
        </Button>
      </PopoverContent>
    </Popover>
  );
}

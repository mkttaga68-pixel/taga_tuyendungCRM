"use client";

import { Filter, Plus, X } from "lucide-react";
import {
  FIELD_TYPE_OPERATORS,
  FILTER_OPERATOR_LABELS,
  FILTERABLE_FIELD_TYPES,
  type FieldDefinitionDto,
  type FilterCondition,
  type FilterOperator,
} from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PipelineStageDto } from "@/lib/pipeline-stages-api";
import type { UserLookupDto } from "@/lib/users-lookup-api";
import { FilterValueInput } from "./filter-value-input";

interface FilterPopoverProps {
  fields: FieldDefinitionDto[];
  filters: FilterCondition[];
  onChange: (filters: FilterCondition[]) => void;
  pipelineStages: PipelineStageDto[];
  users: UserLookupDto[];
}

export function FilterPopover({ fields, filters, onChange, pipelineStages, users }: FilterPopoverProps) {
  const filterableFields = fields.filter((f) => FILTERABLE_FIELD_TYPES.has(f.fieldType));

  function updateRow(index: number, patch: Partial<FilterCondition>) {
    const next = filters.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChange(next);
  }

  function removeRow(index: number) {
    onChange(filters.filter((_, i) => i !== index));
  }

  function addRow() {
    const firstField = filterableFields[0];
    if (!firstField) return;
    const operator = FIELD_TYPE_OPERATORS[firstField.fieldType][0];
    if (!operator) return;
    onChange([...filters, { fieldKey: firstField.fieldKey, operator, value: undefined }]);
  }

  function handleFieldChange(index: number, fieldKey: string) {
    const field = filterableFields.find((f) => f.fieldKey === fieldKey);
    const operator = field ? FIELD_TYPE_OPERATORS[field.fieldType][0] : undefined;
    if (!operator) return;
    updateRow(index, { fieldKey, operator, value: undefined });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant={filters.length > 0 ? "secondary" : "ghost"} className="gap-1.5">
          <Filter className="size-4" />
          Lọc {filters.length > 0 ? `(${filters.length})` : ""}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto min-w-[420px] space-y-2 p-3">
        {filters.length === 0 && (
          <p className="px-1 text-sm text-muted-foreground">Chưa có điều kiện lọc nào.</p>
        )}
        {filters.map((condition, index) => {
          const field = filterableFields.find((f) => f.fieldKey === condition.fieldKey);
          const operators = field ? FIELD_TYPE_OPERATORS[field.fieldType] : [];
          return (
            <div key={index} className="flex items-center gap-1.5">
              {index === 0 ? (
                <span className="w-10 shrink-0 text-xs text-muted-foreground">Khi</span>
              ) : (
                <span className="w-10 shrink-0 text-xs text-muted-foreground">Và</span>
              )}
              <Select value={condition.fieldKey} onValueChange={(v) => handleFieldChange(index, v)}>
                <SelectTrigger className="h-8 w-36">
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
                onValueChange={(v) => updateRow(index, { operator: v as FilterOperator, value: undefined })}
              >
                <SelectTrigger className="h-8 w-40">
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
                  onChange={(value) => updateRow(index, { value })}
                  pipelineStages={pipelineStages}
                  users={users}
                />
              )}

              <Button
                size="icon"
                variant="ghost"
                className="size-8 shrink-0"
                onClick={() => removeRow(index)}
                aria-label="Xoá điều kiện"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          );
        })}

        <Button size="sm" variant="ghost" className="gap-1.5" onClick={addRow}>
          <Plus className="size-4" />
          Thêm điều kiện
        </Button>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { ArrowDownUp, Plus, X } from "lucide-react";
import {
  SORTABLE_FIELD_TYPES,
  type FieldDefinitionDto,
  type SortCondition,
} from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SortPopoverProps {
  fields: FieldDefinitionDto[];
  sorts: SortCondition[];
  onChange: (sorts: SortCondition[]) => void;
}

export function SortPopover({ fields, sorts, onChange }: SortPopoverProps) {
  const sortableFields = fields.filter((f) => SORTABLE_FIELD_TYPES.has(f.fieldType));

  function updateRow(index: number, patch: Partial<SortCondition>) {
    onChange(sorts.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function removeRow(index: number) {
    onChange(sorts.filter((_, i) => i !== index));
  }

  function addRow() {
    const used = new Set(sorts.map((s) => s.fieldKey));
    const next = sortableFields.find((f) => !used.has(f.fieldKey));
    if (!next) return;
    onChange([...sorts, { fieldKey: next.fieldKey, direction: "asc" }]);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant={sorts.length > 0 ? "secondary" : "ghost"} className="gap-1.5">
          <ArrowDownUp className="size-4" />
          Sắp xếp {sorts.length > 0 ? `(${sorts.length})` : ""}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto min-w-[360px] space-y-2 p-3">
        {sorts.length === 0 && (
          <p className="px-1 text-sm text-muted-foreground">Chưa sắp xếp theo trường nào.</p>
        )}
        {sorts.map((sort, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <span className="w-10 shrink-0 text-xs text-muted-foreground">
              {index === 0 ? "Theo" : "Sau đó"}
            </span>
            <Select value={sort.fieldKey} onValueChange={(v) => updateRow(index, { fieldKey: v })}>
              <SelectTrigger className="h-8 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortableFields.map((f) => (
                  <SelectItem key={f.fieldKey} value={f.fieldKey}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sort.direction}
              onValueChange={(v) => updateRow(index, { direction: v as "asc" | "desc" })}
            >
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">A → Z</SelectItem>
                <SelectItem value="desc">Z → A</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="icon"
              variant="ghost"
              className="size-8 shrink-0"
              onClick={() => removeRow(index)}
              aria-label="Xoá sắp xếp"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ))}
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5"
          onClick={addRow}
          disabled={sorts.length >= sortableFields.length}
        >
          <Plus className="size-4" />
          Thêm sắp xếp
        </Button>
      </PopoverContent>
    </Popover>
  );
}

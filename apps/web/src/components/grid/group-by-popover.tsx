"use client";

import { Layers } from "lucide-react";
import { SORTABLE_FIELD_TYPES, type FieldDefinitionDto } from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface GroupByPopoverProps {
  fields: FieldDefinitionDto[];
  groupBy: string | null;
  onChange: (fieldKey: string | null) => void;
}

/** Group dùng chung khả năng sort (cần ORDER BY trên cùng cột để gom nhóm liên tục). */
export function GroupByPopover({ fields, groupBy, onChange }: GroupByPopoverProps) {
  const groupableFields = fields.filter((f) => SORTABLE_FIELD_TYPES.has(f.fieldType));
  const activeLabel = groupableFields.find((f) => f.fieldKey === groupBy)?.label;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant={groupBy ? "secondary" : "ghost"} className="gap-1.5">
          <Layers className="size-4" />
          Nhóm theo {activeLabel ? `(${activeLabel})` : ""}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <button
          className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
          onClick={() => onChange(null)}
        >
          Không nhóm
        </button>
        <div className="max-h-72 overflow-y-auto">
          {groupableFields.map((f) => (
            <button
              key={f.fieldKey}
              className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted ${
                f.fieldKey === groupBy ? "bg-muted font-medium" : ""
              }`}
              onClick={() => onChange(f.fieldKey)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

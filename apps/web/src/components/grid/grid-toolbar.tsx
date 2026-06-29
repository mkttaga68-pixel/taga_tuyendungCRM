"use client";

import { useRef, useState } from "react";
import { Download, Redo2, Search, SlidersHorizontal, Undo2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import type { ColorRule, FieldDefinitionDto, FilterCondition, SortCondition } from "@taga-crm/shared";
import { useGridStore } from "@/stores/grid-store";
import type { PipelineStageDto } from "@/lib/pipeline-stages-api";
import type { UserLookupDto } from "@/lib/users-lookup-api";
import { FilterPopover } from "./filter-popover";
import { SortPopover } from "./sort-popover";
import { GroupByPopover } from "./group-by-popover";
import { ColorRulesPopover } from "./color-rules-popover";

interface GridToolbarProps {
  fields: FieldDefinitionDto[];
  onAddRecordClick: () => void;
  onToggleFieldHidden: (fieldId: string, isHidden: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  pipelineStages: PipelineStageDto[];
  users: UserLookupDto[];
  search: string;
  onSearchChange: (value: string) => void;
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
  sorts: SortCondition[];
  onSortsChange: (sorts: SortCondition[]) => void;
  groupBy: string | null;
  onGroupByChange: (fieldKey: string | null) => void;
  colorRules: ColorRule[];
  onColorRulesChange: (rules: ColorRule[]) => void;
  onExport: (format: "xlsx" | "csv") => void;
  onImportFile: (file: File) => void;
}

export function GridToolbar({
  fields,
  onAddRecordClick,
  onToggleFieldHidden,
  onUndo,
  onRedo,
  pipelineStages,
  users,
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  sorts,
  onSortsChange,
  groupBy,
  onGroupByChange,
  colorRules,
  onColorRulesChange,
  onExport,
  onImportFile,
}: GridToolbarProps) {
  const canUndo = useGridStore((s) => s.undoStack.length > 0);
  const canRedo = useGridStore((s) => s.redoStack.length > 0);
  const [searchOpen, setSearchOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex h-11 shrink-0 items-center gap-1.5 border-b px-3">
      <Button size="sm" onClick={onAddRecordClick}>
        + Thêm bản ghi
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="ghost" className="gap-1.5">
            <SlidersHorizontal className="size-4" />
            Tùy chỉnh trường
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-2">
          <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">
            Hiện/ẩn trường trên Grid
          </p>
          <div className="max-h-80 space-y-0.5 overflow-y-auto">
            {fields.map((field) => (
              <label
                key={field.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <Checkbox
                  checked={!field.isHidden}
                  onCheckedChange={(checked) => onToggleFieldHidden(field.id, !checked)}
                />
                {field.label}
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <FilterPopover
        fields={fields}
        filters={filters}
        onChange={onFiltersChange}
        pipelineStages={pipelineStages}
        users={users}
      />
      <GroupByPopover fields={fields} groupBy={groupBy} onChange={onGroupByChange} />
      <SortPopover fields={fields} sorts={sorts} onChange={onSortsChange} />
      <ColorRulesPopover
        fields={fields}
        colorRules={colorRules}
        onChange={onColorRulesChange}
        pipelineStages={pipelineStages}
        users={users}
      />

      <div className="ml-auto flex items-center gap-1">
        {searchOpen ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm tên, SĐT, email, ghi chú..."
              className="h-8 w-56"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  onSearchChange("");
                  setSearchOpen(false);
                }
              }}
            />
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => {
                onSearchChange("");
                setSearchOpen(false);
              }}
              aria-label="Đóng tìm kiếm"
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <Button size="icon" variant="ghost" className="size-8" onClick={() => setSearchOpen(true)} aria-label="Tìm kiếm">
            <Search className="size-4" />
          </Button>
        )}
        <Button size="icon" variant="ghost" disabled={!canUndo} onClick={onUndo} aria-label="Undo">
          <Undo2 className="size-4" />
        </Button>
        <Button size="icon" variant="ghost" disabled={!canRedo} onClick={onRedo} aria-label="Redo">
          <Redo2 className="size-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button size="icon" variant="ghost" className="size-8" aria-label="Xuất file">
              <Download className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-40 p-1">
            <button
              className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => onExport("xlsx")}
            >
              Xuất Excel (.xlsx)
            </button>
            <button
              className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => onExport("csv")}
            >
              Xuất CSV (.csv)
            </button>
          </PopoverContent>
        </Popover>

        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImportFile(file);
            e.target.value = "";
          }}
        />
        <Button
          size="icon"
          variant="ghost"
          className="size-8"
          aria-label="Nhập file"
          onClick={() => importInputRef.current?.click()}
        >
          <Upload className="size-4" />
        </Button>
      </div>
    </div>
  );
}

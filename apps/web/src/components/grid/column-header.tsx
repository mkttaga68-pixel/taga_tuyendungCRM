"use client";

import { useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Calendar,
  CheckSquare,
  ChevronDown,
  Hash,
  Lock,
  Mail,
  Link as LinkIcon,
  Phone,
  Type,
  User,
  type LucideIcon,
} from "lucide-react";
import type { FieldDefinitionDto, FieldType } from "@taga-crm/shared";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FIELD_TYPE_ICONS: Partial<Record<FieldType, LucideIcon>> = {
  TEXT: Type,
  LONG_TEXT: Type,
  NUMBER: Hash,
  CURRENCY: Hash,
  PERCENT: Hash,
  RATING: Hash,
  PHONE: Phone,
  EMAIL: Mail,
  DATE: Calendar,
  DATETIME: Calendar,
  CREATED_TIME: Calendar,
  UPDATED_TIME: Calendar,
  CHECKBOX: CheckSquare,
  LINK: LinkIcon,
  USER: User,
};

interface ColumnHeaderProps {
  field: FieldDefinitionDto;
  width: number;
  onRename: (label: string) => void;
  onToggleHidden: () => void;
  onDelete: () => void;
  onResizeEnd: (width: number) => void;
}

export function ColumnHeader({ field, width, onRename, onToggleHidden, onDelete, onResizeEnd }: ColumnHeaderProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });
  const [renaming, setRenaming] = useState(false);
  const [label, setLabel] = useState(field.label);
  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(width);

  const Icon = FIELD_TYPE_ICONS[field.fieldType] ?? Type;
  const effectiveWidth = liveWidth ?? width;

  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragStartX.current = e.clientX;
    dragStartWidth.current = width;

    function onMove(ev: PointerEvent) {
      const next = Math.min(800, Math.max(60, dragStartWidth.current + (ev.clientX - dragStartX.current)));
      setLiveWidth(next);
    }
    function onUp(ev: PointerEvent) {
      const next = Math.min(800, Math.max(60, dragStartWidth.current + (ev.clientX - dragStartX.current)));
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setLiveWidth(null);
      onResizeEnd(next);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function commitRename() {
    setRenaming(false);
    const trimmed = label.trim();
    if (trimmed && trimmed !== field.label) {
      onRename(trimmed);
    } else {
      setLabel(field.label);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        width: effectiveWidth,
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={cn(
        "group relative flex h-8 shrink-0 items-center gap-1 border-b border-r bg-muted/40 px-2 text-xs font-medium select-none",
        isDragging && "z-10 opacity-70",
      )}
    >
      {field.isFrozen && <Lock className="size-3 text-muted-foreground" />}
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />

      {renaming ? (
        <Input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setLabel(field.label);
              setRenaming(false);
            }
          }}
          className="h-6 px-1 text-xs"
        />
      ) : (
        <span {...attributes} {...listeners} className="flex-1 cursor-grab truncate">
          {field.label}
        </span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded p-0.5 opacity-0 hover:bg-accent group-hover:opacity-100">
            <ChevronDown className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setRenaming(true)}>Đổi tên trường</DropdownMenuItem>
          <DropdownMenuItem onClick={onToggleHidden}>
            {field.isHidden ? "Hiện trường" : "Ẩn trường"}
          </DropdownMenuItem>
          {!field.isSystem && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                Xoá trường
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <div
        onPointerDown={startResize}
        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-primary/50"
      />
    </div>
  );
}

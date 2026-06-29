"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { EMAIL_BLOCK_TYPE_LABELS, type EmailBlock } from "@taga-crm/shared";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { describeBlock } from "./block-helpers";

interface BlockCanvasRowProps {
  block: EmailBlock;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function BlockCanvasRow({ block, isSelected, onSelect, onDelete }: BlockCanvasRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={onSelect}
      className={cn(
        "group flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm",
        isSelected ? "border-primary ring-1 ring-primary" : "hover:border-muted-foreground/40",
        isDragging && "z-10 opacity-70",
      )}
    >
      <span {...attributes} {...listeners} className="cursor-grab text-muted-foreground">
        <GripVertical className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium">{EMAIL_BLOCK_TYPE_LABELS[block.type]}</div>
        <div className="truncate text-xs text-muted-foreground">{describeBlock(block)}</div>
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import {
  EMAIL_BLOCK_TYPE_LABELS,
  EMAIL_BLOCK_TYPES,
  type EmailBlock,
  type EmailBlockType,
  type EmailLeafBlock,
} from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BlockCanvasRow } from "./block-canvas-row";
import { LeafBlockFields, type TemplateVariable } from "./leaf-block-fields";
import { createDefaultBlock, describeBlock } from "./block-helpers";

const LEAF_BLOCK_TYPES = EMAIL_BLOCK_TYPES.filter((t) => t !== "SECTION");

interface EmailBuilderProps {
  blocks: EmailBlock[];
  onChange: (blocks: EmailBlock[]) => void;
  variables?: TemplateVariable[];
}

export function EmailBuilder({ blocks, onChange, variables }: EmailBuilderProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = blocks.findIndex((b) => b.id === active.id);
    const toIndex = blocks.findIndex((b) => b.id === over.id);
    if (fromIndex === -1 || toIndex === -1) return;
    const next = [...blocks];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onChange(next);
  }

  function addBlock(type: EmailBlockType) {
    const block = createDefaultBlock(type);
    onChange([...blocks, block]);
    setSelectedId(block.id);
  }

  function updateBlock(id: string, next: EmailBlock) {
    onChange(blocks.map((b) => (b.id === id ? next : b)));
  }

  function deleteBlock(id: string) {
    onChange(blocks.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;

  return (
    <div className="grid h-full grid-cols-[200px_1fr_320px] gap-4">
      {/* Palette */}
      <div className="space-y-2 overflow-auto rounded-lg border p-3">
        <p className="mb-1 text-xs font-medium text-muted-foreground">Thêm block</p>
        {EMAIL_BLOCK_TYPES.map((type) => (
          <Button
            key={type}
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => addBlock(type)}
          >
            + {EMAIL_BLOCK_TYPE_LABELS[type]}
          </Button>
        ))}
      </div>

      {/* Canvas */}
      <div className="space-y-2 overflow-auto rounded-lg border bg-muted/20 p-3">
        {blocks.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Chưa có block nào — bấm vào palette bên trái để thêm.
          </p>
        )}
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {blocks.map((block) => (
                <BlockCanvasRow
                  key={block.id}
                  block={block}
                  isSelected={block.id === selectedId}
                  onSelect={() => setSelectedId(block.id)}
                  onDelete={() => deleteBlock(block.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Properties */}
      <div className="overflow-auto rounded-lg border p-3">
        {!selectedBlock && (
          <p className="text-sm text-muted-foreground">Chọn 1 block ở giữa để chỉnh thuộc tính.</p>
        )}
        {selectedBlock && selectedBlock.type !== "SECTION" && (
          <LeafBlockFields
            block={selectedBlock}
            onChange={(next) => updateBlock(selectedBlock.id, next)}
            variables={variables}
          />
        )}
        {selectedBlock && selectedBlock.type === "SECTION" && (
          <SectionFields
            block={selectedBlock}
            onChange={(next) => updateBlock(selectedBlock.id, next)}
            variables={variables}
          />
        )}
      </div>
    </div>
  );
}

interface SectionFieldsProps {
  block: Extract<EmailBlock, { type: "SECTION" }>;
  onChange: (next: Extract<EmailBlock, { type: "SECTION" }>) => void;
  variables?: TemplateVariable[];
}

function SectionFields({ block, onChange, variables }: SectionFieldsProps) {
  const [childAddType, setChildAddType] = useState<EmailBlockType>("TEXT");

  function updateChild(id: string, next: EmailLeafBlock) {
    onChange({ ...block, blocks: block.blocks.map((b) => (b.id === id ? next : b)) });
  }

  function removeChild(id: string) {
    onChange({ ...block, blocks: block.blocks.filter((b) => b.id !== id) });
  }

  function moveChild(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= block.blocks.length) return;
    const next = [...block.blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...block, blocks: next });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-xs">Màu nền</Label>
        <Input
          type="color"
          className="h-8 w-full p-1"
          value={block.backgroundColor}
          onChange={(e) => onChange({ ...block, backgroundColor: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Padding (px)</Label>
        <Input
          type="number"
          value={block.padding}
          onChange={(e) => onChange({ ...block, padding: Number(e.target.value) || 0 })}
        />
      </div>

      <div className="space-y-2 border-t pt-3">
        <Label className="text-xs">Block con</Label>
        {block.blocks.map((child, idx) => (
          <details key={child.id} className="rounded-md border p-2">
            <summary className="flex cursor-pointer items-center justify-between text-xs">
              <span>
                {EMAIL_BLOCK_TYPE_LABELS[child.type]} — {describeBlock(child)}
              </span>
              <span className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.preventDefault();
                    moveChild(idx, -1);
                  }}
                >
                  <ArrowUp className="size-3" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.preventDefault();
                    moveChild(idx, 1);
                  }}
                >
                  <ArrowDown className="size-3" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.preventDefault();
                    removeChild(child.id);
                  }}
                >
                  <Trash2 className="size-3" />
                </Button>
              </span>
            </summary>
            <div className="mt-2">
              <LeafBlockFields block={child} onChange={(next) => updateChild(child.id, next)} compact variables={variables} />
            </div>
          </details>
        ))}

        <div className="flex gap-2">
          <Select value={childAddType} onValueChange={(v) => setChildAddType(v as EmailBlockType)}>
            <SelectTrigger className="h-8 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAF_BLOCK_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {EMAIL_BLOCK_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              onChange({
                ...block,
                blocks: [...block.blocks, createDefaultBlock(childAddType) as EmailLeafBlock],
              })
            }
          >
            + Thêm
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { Checkbox } from "@/components/ui/checkbox";
import { CREATABLE_CUSTOM_FIELD_TYPES, type FieldDefinitionDto } from "@taga-crm/shared";
import { ColumnHeader } from "./column-header";
import { AddColumnPopover } from "./add-column-popover";
import { ROW_NUMBER_COL_WIDTH, CHECKBOX_COL_WIDTH } from "./grid-constants";

interface GridHeaderRowProps {
  fields: FieldDefinitionDto[];
  allRowsSelected: boolean;
  onToggleSelectAll: (checked: boolean) => void;
  onReorder: (fromId: string, toId: string) => void;
  onRename: (fieldId: string, label: string) => void;
  onToggleHidden: (fieldId: string, isHidden: boolean) => void;
  onDelete: (fieldId: string) => void;
  onResizeEnd: (fieldId: string, width: number) => void;
  onCreateField: (input: {
    label: string;
    fieldKey: string;
    fieldType: (typeof CREATABLE_CUSTOM_FIELD_TYPES)[number];
    options?: Record<string, unknown>;
  }) => void;
}

export function GridHeaderRow({
  fields,
  allRowsSelected,
  onToggleSelectAll,
  onReorder,
  onRename,
  onToggleHidden,
  onDelete,
  onResizeEnd,
  onCreateField,
}: GridHeaderRowProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(String(active.id), String(over.id));
    }
  }

  return (
    <div className="sticky top-0 z-20 flex bg-background">
      <div
        style={{ width: CHECKBOX_COL_WIDTH }}
        className="flex h-8 shrink-0 items-center justify-center border-b border-r bg-muted/40"
      >
        <Checkbox checked={allRowsSelected} onCheckedChange={(c) => onToggleSelectAll(Boolean(c))} />
      </div>
      <div
        style={{ width: ROW_NUMBER_COL_WIDTH }}
        className="flex h-8 shrink-0 items-center justify-center border-b border-r bg-muted/40 text-xs text-muted-foreground"
      >
        #
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={fields.map((f) => f.id)} strategy={horizontalListSortingStrategy}>
          {fields.map((field) => (
            <ColumnHeader
              key={field.id}
              field={field}
              width={field.width}
              onRename={(label) => onRename(field.id, label)}
              onToggleHidden={() => onToggleHidden(field.id, !field.isHidden)}
              onDelete={() => onDelete(field.id)}
              onResizeEnd={(w) => onResizeEnd(field.id, w)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <AddColumnPopover existingFields={fields} onCreate={onCreateField} />
    </div>
  );
}

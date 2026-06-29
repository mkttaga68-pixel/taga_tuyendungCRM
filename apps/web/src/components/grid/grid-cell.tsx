"use client";

import { memo } from "react";
import type { CandidateDto, FieldDefinitionDto } from "@taga-crm/shared";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import type { PipelineStageDto } from "@/lib/pipeline-stages-api";
import type { UserLookupDto } from "@/lib/users-lookup-api";
import { getCellValue, isFieldEditable } from "./candidate-field-value";
import { CellDisplay } from "./cell-display";
import { CellEditor } from "./cell-editor";
import { RelationCellEditor } from "./relation-cell-editor";

interface GridCellProps {
  candidate: CandidateDto;
  field: FieldDefinitionDto;
  width: number;
  isActive: boolean;
  isInRange: boolean;
  isEditing: boolean;
  pipelineStages: PipelineStageDto[];
  users: UserLookupDto[];
  onActivate: (extend: boolean) => void;
  onStartEdit: () => void;
  onCommit: (value: unknown) => void;
  onCancelEdit: () => void;
}

function GridCellImpl({
  candidate,
  field,
  width,
  isActive,
  isInRange,
  isEditing,
  pipelineStages,
  users,
  onActivate,
  onStartEdit,
  onCommit,
  onCancelEdit,
}: GridCellProps) {
  const editable = isFieldEditable(field);

  if (field.fieldType === "CHECKBOX" && !isEditing) {
    const value = Boolean(getCellValue(candidate, field));
    return (
      <div
        style={{ width }}
        className={cn(
          "flex h-8 shrink-0 items-center justify-center border-b border-r",
          isActive && "ring-2 ring-inset ring-primary",
          isInRange && !isActive && "bg-primary/10",
        )}
        onMouseDown={(e) => onActivate(e.shiftKey)}
      >
        <Checkbox
          checked={value}
          disabled={!editable}
          onCheckedChange={(checked) => onCommit(Boolean(checked))}
        />
      </div>
    );
  }

  if (field.fieldType === "RELATION") {
    return (
      <RelationCellEditor candidate={candidate} field={field} isOpen={isEditing} onClose={onCancelEdit}>
        <div
          style={{ width }}
          className={cn(
            "flex h-8 shrink-0 cursor-pointer items-center overflow-hidden border-b border-r px-2 text-sm",
            isActive && "ring-2 ring-inset ring-primary",
            isInRange && !isActive && "bg-primary/10",
          )}
          onMouseDown={(e) => onActivate(e.shiftKey)}
          onDoubleClick={() => onStartEdit()}
        >
          <CellDisplay candidate={candidate} field={field} />
        </div>
      </RelationCellEditor>
    );
  }

  return (
    <div
      style={{ width }}
      className={cn(
        "flex h-8 shrink-0 items-center overflow-hidden border-b border-r px-2 text-sm",
        isActive && "ring-2 ring-inset ring-primary",
        isInRange && !isActive && "bg-primary/10",
        !editable && "bg-muted/40",
      )}
      onMouseDown={(e) => onActivate(e.shiftKey)}
      onDoubleClick={() => editable && onStartEdit()}
    >
      {isEditing ? (
        <CellEditor
          candidate={candidate}
          field={field}
          pipelineStages={pipelineStages}
          users={users}
          onCommit={onCommit}
          onCancel={onCancelEdit}
        />
      ) : (
        <CellDisplay candidate={candidate} field={field} />
      )}
    </div>
  );
}

export const GridCell = memo(GridCellImpl);

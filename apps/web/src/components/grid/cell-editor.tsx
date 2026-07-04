"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import type { CandidateDto, FieldDefinitionDto } from "@taga-crm/shared";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PipelineStageDto } from "@/lib/pipeline-stages-api";
import type { UserLookupDto } from "@/lib/users-lookup-api";
import { getCellValue, getRelationId } from "./candidate-field-value";

interface SelectChoice {
  value: string;
  label: string;
  color?: string;
}

interface CellEditorProps {
  candidate: CandidateDto;
  field: FieldDefinitionDto;
  pipelineStages: PipelineStageDto[];
  users: UserLookupDto[];
  onCommit: (value: unknown) => void;
  onCancel: () => void;
}

function computeInitialText(field: FieldDefinitionDto, value: unknown): string {
  if (field.fieldType === "MULTI_SELECT") {
    return Array.isArray(value) ? (value as string[]).join(", ") : "";
  }
  if (value === null || value === undefined) return "";
  return String(value);
}

// stopPropagation prevents the mousedown from bubbling through the React tree to the
// grid cell's onMouseDown handler (which calls setActiveCell → editingCell:null),
// which would unmount CellEditor before the subsequent click event fires.
function stopMouseDown(e: React.MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

function MultiSelectEditor({
  choices,
  initialSelected,
  onCommit,
}: {
  choices: SelectChoice[];
  initialSelected: string[];
  onCommit: (value: unknown) => void;
}) {
  const [picked, setPicked] = useState<string[]>(initialSelected);

  function toggle(val: string) {
    setPicked((prev) => (prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]));
  }

  return (
    <Popover defaultOpen onOpenChange={(open) => { if (!open) onCommit(picked); }}>
      <PopoverTrigger asChild>
        <button type="button" className="h-8 w-full px-2 text-left text-sm truncate">
          {picked.length === 0 ? (
            <span className="text-muted-foreground">Chọn...</span>
          ) : (
            choices.filter((c) => picked.includes(c.value)).map((c) => c.label).join(", ")
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start" onMouseDown={stopMouseDown}>
        {choices.map((choice) => {
          const isChecked = picked.includes(choice.value);
          return (
            <button
              key={choice.value}
              type="button"
              onClick={() => toggle(choice.value)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/60"
            >
              <span
                className={`size-3.5 shrink-0 rounded-sm border ${isChecked ? "bg-primary border-primary" : "border-input"}`}
              />
              <span
                className="rounded px-1.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${choice.color ?? "#6B7280"}26`, color: choice.color ?? "#6B7280" }}
              >
                {choice.label}
              </span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

export function CellEditor({
  candidate,
  field,
  pipelineStages,
  users,
  onCommit,
  onCancel,
}: CellEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const value = getCellValue(candidate, field);
  const [text, setText] = useState<string>(() => computeInitialText(field, value));

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent, commitValue: () => void) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitValue();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }

  if (field.fieldKey === "statusId") {
    const currentStage = pipelineStages.find((s) => s.id === getRelationId(candidate, "statusId"));
    return (
      <Popover open onOpenChange={() => {}}>
        <PopoverTrigger asChild>
          <button type="button" className="h-8 w-full truncate px-2 text-left text-sm">
            {currentStage?.label ?? <span className="text-muted-foreground">Chọn...</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-48 p-1"
          align="start"
          onInteractOutside={(e) => { e.preventDefault(); onCancel(); }}
          onEscapeKeyDown={onCancel}
        >
          {pipelineStages.map((stage) => (
            <button
              key={stage.id}
              type="button"
              onMouseDown={stopMouseDown}
              onClick={() => onCommit(stage.id)}
              className="flex w-full items-center rounded px-2 py-1.5 text-sm hover:bg-muted/60"
            >
              {stage.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    );
  }

  if (field.fieldKey === "recruiterId") {
    const currentUser2 = users.find((u) => u.id === getRelationId(candidate, "recruiterId"));
    return (
      <Popover open onOpenChange={() => {}}>
        <PopoverTrigger asChild>
          <button type="button" className="h-8 w-full truncate px-2 text-left text-sm">
            {currentUser2?.fullName ?? <span className="text-muted-foreground">— Không gán —</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-48 p-1"
          align="start"
          onInteractOutside={(e) => { e.preventDefault(); onCancel(); }}
          onEscapeKeyDown={onCancel}
        >
          <button
            type="button"
            onMouseDown={stopMouseDown}
            onClick={() => onCommit(null)}
            className="flex w-full items-center rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/60"
          >
            — Không gán —
          </button>
          {users.map((u) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={stopMouseDown}
              onClick={() => onCommit(u.id)}
              className="flex w-full items-center rounded px-2 py-1.5 text-sm hover:bg-muted/60"
            >
              {u.fullName}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    );
  }

  if (field.fieldType === "SELECT") {
    const choices = (field.options?.choices as SelectChoice[] | undefined) ?? [];
    const currentChoice = choices.find((c) => c.value === value);
    return (
      <Popover open onOpenChange={() => {}}>
        <PopoverTrigger asChild>
          <button type="button" className="h-8 w-full truncate px-2 text-left text-sm">
            {currentChoice ? (
              <span
                className="rounded px-1.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: `${currentChoice.color ?? "#6B7280"}26`,
                  color: currentChoice.color ?? "#6B7280",
                }}
              >
                {currentChoice.label}
              </span>
            ) : (
              <span className="text-muted-foreground">Chọn...</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-48 p-1"
          align="start"
          onInteractOutside={(e) => { e.preventDefault(); onCancel(); }}
          onEscapeKeyDown={onCancel}
        >
          <button
            type="button"
            onMouseDown={stopMouseDown}
            onClick={() => onCommit(null)}
            className="flex w-full items-center rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/60"
          >
            — Trống —
          </button>
          {choices.map((choice) => (
            <button
              key={choice.value}
              type="button"
              onMouseDown={stopMouseDown}
              onClick={() => onCommit(choice.value)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/60"
            >
              <span
                className="rounded px-1.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: `${choice.color ?? "#6B7280"}26`,
                  color: choice.color ?? "#6B7280",
                }}
              >
                {choice.label}
              </span>
            </button>
          ))}
        </PopoverContent>
      </Popover>
    );
  }

  if (field.fieldType === "DATE") {
    const dateValue = value ? new Date(String(value)) : undefined;
    return (
      <Popover open onOpenChange={() => {}}>
        <PopoverTrigger asChild>
          <button type="button" className="h-8 w-full px-2 text-left text-sm">
            {dateValue ? format(dateValue, "dd/MM/yyyy") : "Chọn ngày"}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="start"
          onMouseDown={stopMouseDown}
          onInteractOutside={(e) => { e.preventDefault(); onCancel(); }}
          onEscapeKeyDown={onCancel}
        >
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={(date) => onCommit(date ? format(date, "yyyy-MM-dd") : null)}
          />
        </PopoverContent>
      </Popover>
    );
  }

  if (field.fieldType === "LONG_TEXT") {
    return (
      <Textarea
        autoFocus
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => onCommit(text)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
        className="resize-none border-0 shadow-none"
      />
    );
  }

  if (field.fieldType === "MULTI_SELECT") {
    const choices = (field.options?.choices as SelectChoice[] | undefined) ?? [];
    const selected = Array.isArray(value) ? (value as string[]) : [];
    if (choices.length === 0) {
      const commitTags = () => onCommit(text.split(",").map((t) => t.trim()).filter(Boolean));
      return (
        <Input
          ref={inputRef}
          value={text}
          placeholder="tag1, tag2..."
          onChange={(e) => setText(e.target.value)}
          onBlur={commitTags}
          onKeyDown={(e) => handleKeyDown(e, commitTags)}
          className="h-8 border-0 shadow-none"
        />
      );
    }
    return <MultiSelectEditor choices={choices} initialSelected={selected} onCommit={onCommit} />;
  }

  if (
    field.fieldType === "NUMBER" ||
    field.fieldType === "CURRENCY" ||
    field.fieldType === "PERCENT" ||
    field.fieldType === "RATING"
  ) {
    const commitNumber = () => onCommit(text === "" ? null : Number(text));
    return (
      <Input
        ref={inputRef}
        type="number"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commitNumber}
        onKeyDown={(e) => handleKeyDown(e, commitNumber)}
        className="h-8 border-0 shadow-none"
      />
    );
  }

  // TEXT, PHONE, EMAIL, LINK, và field tự thêm dạng text khác.
  const commitText = () => onCommit(text);
  return (
    <Input
      ref={inputRef}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commitText}
      onKeyDown={(e) => handleKeyDown(e, commitText)}
      className="h-8 border-0 shadow-none"
    />
  );
}

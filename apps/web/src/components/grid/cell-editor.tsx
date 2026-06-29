"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import type { CandidateDto, FieldDefinitionDto } from "@taga-crm/shared";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PipelineStageDto } from "@/lib/pipeline-stages-api";
import type { UserLookupDto } from "@/lib/users-lookup-api";
import { getCellValue, getRelationId } from "./candidate-field-value";

interface SelectChoice {
  value: string;
  label: string;
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
    return (
      <Select
        defaultValue={getRelationId(candidate, "statusId") ?? undefined}
        onValueChange={onCommit}
        onOpenChange={(open) => !open && onCancel()}
        open
      >
        <SelectTrigger className="h-8 w-full border-0 shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {pipelineStages.map((stage) => (
            <SelectItem key={stage.id} value={stage.id}>
              {stage.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.fieldKey === "recruiterId") {
    return (
      <Select
        defaultValue={getRelationId(candidate, "recruiterId") ?? "__none__"}
        onValueChange={(v) => onCommit(v === "__none__" ? null : v)}
        onOpenChange={(open) => !open && onCancel()}
        open
      >
        <SelectTrigger className="h-8 w-full border-0 shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">— Không gán —</SelectItem>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.fullName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.fieldType === "SELECT") {
    const choices = (field.options?.choices as SelectChoice[] | undefined) ?? [];
    return (
      <Select
        defaultValue={(value as string) ?? undefined}
        onValueChange={onCommit}
        onOpenChange={(open) => !open && onCancel()}
        open
      >
        <SelectTrigger className="h-8 w-full border-0 shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {choices.map((choice) => (
            <SelectItem key={choice.value} value={choice.value}>
              {choice.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.fieldType === "DATE") {
    const dateValue = value ? new Date(String(value)) : undefined;
    return (
      <Popover defaultOpen onOpenChange={(open) => !open && onCancel()}>
        <PopoverTrigger asChild>
          <button type="button" className="h-8 w-full px-2 text-left text-sm">
            {dateValue ? format(dateValue, "dd/MM/yyyy") : "Chọn ngày"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
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

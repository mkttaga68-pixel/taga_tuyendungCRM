"use client";

import {
  GENDER_LABELS,
  CANDIDATE_SOURCE_LABELS,
  OPERATORS_WITHOUT_VALUE,
  type FieldDefinitionDto,
  type FilterCondition,
} from "@taga-crm/shared";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { PipelineStageDto } from "@/lib/pipeline-stages-api";
import type { UserLookupDto } from "@/lib/users-lookup-api";

interface Option {
  value: string;
  label: string;
}

function MultiValueSelect({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const selected = new Set(value);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-44 justify-start font-normal">
          {value.length > 0 ? `${value.length} đã chọn` : "Chọn giá trị..."}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <Checkbox
                checked={selected.has(opt.value)}
                onCheckedChange={(checked) => {
                  const next = new Set(selected);
                  if (checked) next.add(opt.value);
                  else next.delete(opt.value);
                  onChange(Array.from(next));
                }}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface SelectChoice {
  value: string;
  label: string;
}

const MULTI_VALUE_OPERATORS = new Set([
  "is_any_of",
  "is_none_of",
  "has_any_of",
  "has_all_of",
  "has_none_of",
]);

export function FilterValueInput({
  field,
  condition,
  onChange,
  pipelineStages,
  users,
}: {
  field: FieldDefinitionDto;
  condition: FilterCondition;
  onChange: (value: unknown) => void;
  pipelineStages: PipelineStageDto[];
  users: UserLookupDto[];
}) {
  if (OPERATORS_WITHOUT_VALUE.has(condition.operator)) return null;

  const isMulti = MULTI_VALUE_OPERATORS.has(condition.operator);
  const stringValue = typeof condition.value === "string" ? condition.value : "";
  const arrayValue = Array.isArray(condition.value) ? (condition.value as string[]) : [];

  if (field.fieldKey === "statusId") {
    const options = pipelineStages.map((s) => ({ value: s.id, label: s.label }));
    return isMulti ? (
      <MultiValueSelect options={options} value={arrayValue} onChange={onChange} />
    ) : (
      <Select value={stringValue} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-40">
          <SelectValue placeholder="Chọn Next Step..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.fieldKey === "recruiterId") {
    const options = users.map((u) => ({ value: u.id, label: u.fullName }));
    return isMulti ? (
      <MultiValueSelect options={options} value={arrayValue} onChange={onChange} />
    ) : (
      <Select value={stringValue} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-40">
          <SelectValue placeholder="Chọn người..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.fieldKey === "gender" || field.fieldKey === "source") {
    const labels = field.fieldKey === "gender" ? GENDER_LABELS : CANDIDATE_SOURCE_LABELS;
    const options = Object.entries(labels).map(([value, label]) => ({ value, label }));
    return isMulti ? (
      <MultiValueSelect options={options} value={arrayValue} onChange={onChange} />
    ) : (
      <Select value={stringValue} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-36">
          <SelectValue placeholder="Chọn..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.fieldType === "SELECT") {
    const choices = (field.options?.choices as SelectChoice[] | undefined) ?? [];
    return isMulti ? (
      <MultiValueSelect options={choices} value={arrayValue} onChange={onChange} />
    ) : (
      <Select value={stringValue} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-36">
          <SelectValue placeholder="Chọn..." />
        </SelectTrigger>
        <SelectContent>
          {choices.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.fieldType === "MULTI_SELECT") {
    const choices = (field.options?.choices as SelectChoice[] | undefined) ?? [];
    if (choices.length > 0) {
      return <MultiValueSelect options={choices} value={arrayValue} onChange={onChange} />;
    }
    return (
      <Input
        className="h-8 w-44"
        placeholder="Giá trị, phân cách bởi dấu phẩy"
        defaultValue={arrayValue.join(", ")}
        onBlur={(e) =>
          onChange(
            e.target.value
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean),
          )
        }
      />
    );
  }

  if (field.fieldType === "CHECKBOX") {
    return (
      <Select value={stringValue || "true"} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Có</SelectItem>
          <SelectItem value="false">Không</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (["NUMBER", "RATING", "CURRENCY", "PERCENT"].includes(field.fieldType)) {
    return (
      <Input
        type="number"
        className="h-8 w-32"
        defaultValue={stringValue}
        onBlur={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      />
    );
  }

  if (["DATE", "DATETIME", "CREATED_TIME", "UPDATED_TIME"].includes(field.fieldType)) {
    return (
      <Input
        type="date"
        className="h-8 w-36"
        defaultValue={stringValue}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <Input
      className="h-8 w-40"
      placeholder="Giá trị..."
      defaultValue={stringValue}
      onBlur={(e) => onChange(e.target.value)}
    />
  );
}

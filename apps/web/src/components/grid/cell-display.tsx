import { format } from "date-fns";
import type { CandidateDto, FieldDefinitionDto } from "@taga-crm/shared";
import { Checkbox } from "@/components/ui/checkbox";
import { getCellValue } from "./candidate-field-value";

interface SelectChoice {
  value: string;
  label: string;
  color: string;
}

function formatSafe(value: unknown, pattern: string): string {
  try {
    return format(new Date(String(value)), pattern);
  } catch {
    return String(value);
  }
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex max-w-full items-center truncate rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}26`, color }}
    >
      {label}
    </span>
  );
}

export function CellDisplay({ candidate, field }: { candidate: CandidateDto; field: FieldDefinitionDto }) {
  const value = getCellValue(candidate, field);

  if (value === null || value === undefined || value === "") {
    return null;
  }

  switch (field.fieldKey) {
    case "statusId": {
      const status = value as { label: string; color: string };
      return <Pill label={status.label} color={status.color} />;
    }
    case "recruiterId": {
      const ref = value as { fullName: string };
      return <span className="truncate">{ref.fullName}</span>;
    }
    case "landingPageId": {
      const ref = value as { name: string };
      return <span className="truncate text-muted-foreground">{ref.name}</span>;
    }
    default:
      break;
  }

  switch (field.fieldType) {
    case "CHECKBOX":
      return <Checkbox checked={Boolean(value)} disabled className="pointer-events-none" />;
    case "SELECT": {
      const choices = (field.options?.choices as SelectChoice[] | undefined) ?? [];
      const choice = choices.find((c) => c.value === value);
      return choice ? <Pill label={choice.label} color={choice.color} /> : <span>{String(value)}</span>;
    }
    case "MULTI_SELECT": {
      const choices = (field.options?.choices as SelectChoice[] | undefined) ?? [];
      const values = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-1">
          {values.map((v) => {
            const choice = choices.find((c) => c.value === v || c.label === v);
            return <Pill key={v} label={v} color={choice?.color ?? "#6366F1"} />;
          })}
        </div>
      );
    }
    case "EMAIL":
      return (
        <a
          href={`mailto:${String(value)}`}
          className="truncate text-primary underline-offset-2 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {String(value)}
        </a>
      );
    case "LINK":
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noreferrer"
          className="truncate text-primary underline-offset-2 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {String(value)}
        </a>
      );
    case "DATE":
      return <span>{formatSafe(value, "dd/MM/yyyy")}</span>;
    case "CREATED_TIME":
    case "UPDATED_TIME":
      return <span className="text-muted-foreground">{formatSafe(value, "dd/MM/yyyy HH:mm")}</span>;
    case "RELATION": {
      const items = Array.isArray(value) ? (value as { id: string; label: string }[]) : [];
      return (
        <div className="flex flex-wrap gap-1">
          {items.map((item) => (
            <Pill key={item.id} label={item.label} color="#0EA5E9" />
          ))}
        </div>
      );
    }
    case "MKT_LIST": {
      const lists = Array.isArray(value) ? (value as { id: string; name: string }[]) : [];
      if (lists.length === 0) return null;
      return (
        <div className="flex flex-wrap gap-1">
          {lists.map((list) => (
            <Pill key={list.id} label={list.name} color="#6366f1" />
          ))}
        </div>
      );
    }
    case "LOOKUP": {
      const items = Array.isArray(value) ? value : [value];
      return <span className="truncate text-muted-foreground">{items.join(", ")}</span>;
    }
    case "ROLLUP":
      return <span className="truncate font-medium">{String(value)}</span>;
    case "FORMULA":
      return (
        <span className={value === "#LỖI" ? "truncate text-destructive" : "truncate"}>
          {String(value)}
        </span>
      );
    default:
      return <span className="truncate">{String(value)}</span>;
  }
}

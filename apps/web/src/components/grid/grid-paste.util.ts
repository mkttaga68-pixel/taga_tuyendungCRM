import type { FieldDefinitionDto } from "@taga-crm/shared";
import type { PipelineStageDto } from "@/lib/pipeline-stages-api";
import type { UserLookupDto } from "@/lib/users-lookup-api";

interface SelectChoice {
  value: string;
  label: string;
}

/** Trả về `undefined` khi không tìm được giá trị khớp (vd: paste text không match label nào) — báo hiệu bỏ qua ô đó. */
export function coerceForPaste(
  field: FieldDefinitionDto,
  text: string,
  pipelineStages: PipelineStageDto[],
  users: UserLookupDto[],
): unknown {
  const trimmed = text.trim();

  if (field.fieldKey === "statusId") {
    return pipelineStages.find((s) => s.label.toLowerCase() === trimmed.toLowerCase())?.id;
  }
  if (field.fieldKey === "recruiterId") {
    if (!trimmed) return null;
    return users.find((u) => u.fullName.toLowerCase() === trimmed.toLowerCase())?.id;
  }

  switch (field.fieldType) {
    case "CHECKBOX":
      return ["true", "1", "x", "✓", "yes", "có"].includes(trimmed.toLowerCase());
    case "MULTI_SELECT":
      return text
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    case "NUMBER":
    case "CURRENCY":
    case "PERCENT":
    case "RATING":
      return trimmed === "" ? null : Number(trimmed);
    case "SELECT": {
      const choices = (field.options?.choices as SelectChoice[] | undefined) ?? [];
      return choices.find((c) => c.label.toLowerCase() === trimmed.toLowerCase())?.value;
    }
    default:
      return text;
  }
}

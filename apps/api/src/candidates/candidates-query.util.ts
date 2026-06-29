import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { FieldDefinition } from "@prisma/client";
import type { FieldType, FilterCondition, SortCondition } from "@taga-crm/shared";

type ColumnKind = "text" | "uuid" | "date" | "timestamp" | "enum" | "text_array";

interface SystemColumn {
  column: string;
  kind: ColumnKind;
}

/** fieldKey (camelCase) -> cột Postgres thật (snake_case) cho field hệ thống của bảng candidates. */
const SYSTEM_FIELD_COLUMNS: Record<string, SystemColumn> = {
  fullName: { column: "full_name", kind: "text" },
  phone: { column: "phone", kind: "text" },
  email: { column: "email", kind: "text" },
  dob: { column: "dob", kind: "date" },
  gender: { column: "gender", kind: "enum" },
  address: { column: "address", kind: "text" },
  areaBranch: { column: "area_branch", kind: "text" },
  facebookLink: { column: "facebook_link", kind: "text" },
  photoUrl: { column: "photo_url", kind: "text" },
  source: { column: "source", kind: "enum" },
  note: { column: "note", kind: "text" },
  nextActionNote: { column: "next_action_note", kind: "text" },
  tags: { column: "tags", kind: "text_array" },
  statusId: { column: "status_id", kind: "uuid" },
  recruiterId: { column: "recruiter_id", kind: "uuid" },
  landingPageId: { column: "landing_page_id", kind: "uuid" },
  firstUtmSource: { column: "first_utm_source", kind: "text" },
  firstUtmMedium: { column: "first_utm_medium", kind: "text" },
  firstUtmCampaign: { column: "first_utm_campaign", kind: "text" },
  firstUtmContent: { column: "first_utm_content", kind: "text" },
  firstUtmTerm: { column: "first_utm_term", kind: "text" },
  firstIp: { column: "first_ip", kind: "text" },
  firstDevice: { column: "first_device", kind: "text" },
  firstOs: { column: "first_os", kind: "text" },
  firstBrowser: { column: "first_browser", kind: "text" },
  firstReferrer: { column: "first_referrer", kind: "text" },
  createdAt: { column: "created_at", kind: "timestamp" },
  updatedAt: { column: "updated_at", kind: "timestamp" },
};

const SEARCHABLE_SYSTEM_COLUMNS = ["full_name", "phone", "email", "note", "next_action_note"];

function asStringArray(value: unknown, fieldKey: string): string[] {
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
    throw new BadRequestException(`Giá trị filter cho "${fieldKey}" phải là danh sách chuỗi`);
  }
  return value as string[];
}

function asScalar(value: unknown, fieldKey: string): string | number | boolean {
  if (value === null || value === undefined || typeof value === "object") {
    throw new BadRequestException(`Giá trị filter cho "${fieldKey}" không hợp lệ`);
  }
  return value as string | number | boolean;
}

/** Build điều kiện WHERE cho 1 field hệ thống (cột thật trong Postgres). */
function buildSystemFilterSql(col: SystemColumn, condition: FilterCondition): Prisma.Sql {
  const ident = Prisma.raw(`"${col.column}"`);
  const { operator, fieldKey } = condition;

  switch (operator) {
    case "is_empty":
      return col.kind === "text_array"
        ? Prisma.sql`(${ident} IS NULL OR array_length(${ident}, 1) IS NULL)`
        : Prisma.sql`${ident} IS NULL`;
    case "is_not_empty":
      return col.kind === "text_array"
        ? Prisma.sql`(${ident} IS NOT NULL AND array_length(${ident}, 1) IS NOT NULL)`
        : Prisma.sql`${ident} IS NOT NULL`;
    default:
      break;
  }

  if (col.kind === "text_array") {
    const values = asStringArray(condition.value, fieldKey);
    if (operator === "has_any_of") return Prisma.sql`${ident} && ${values}::text[]`;
    if (operator === "has_all_of") return Prisma.sql`${ident} @> ${values}::text[]`;
    if (operator === "has_none_of") return Prisma.sql`NOT (${ident} && ${values}::text[])`;
    throw new BadRequestException(`Operator "${operator}" không áp dụng cho field "${fieldKey}"`);
  }

  if (operator === "is_any_of" || operator === "is_none_of") {
    const values = asStringArray(condition.value, fieldKey);
    const cast = col.kind === "uuid" ? "uuid[]" : "text[]";
    const expr =
      col.kind === "enum"
        ? Prisma.sql`${ident}::text = ANY(${values}::${Prisma.raw(cast)})`
        : Prisma.sql`${ident} = ANY(${values}::${Prisma.raw(cast)})`;
    return operator === "is_any_of" ? expr : Prisma.sql`NOT (${expr})`;
  }

  const value = asScalar(condition.value, fieldKey);

  if (col.kind === "uuid") {
    if (operator === "equals") return Prisma.sql`${ident} = ${value}::uuid`;
    if (operator === "not_equals") return Prisma.sql`${ident} IS DISTINCT FROM ${value}::uuid`;
  }

  if (col.kind === "enum") {
    if (operator === "equals") return Prisma.sql`${ident}::text = ${value}`;
    if (operator === "not_equals") return Prisma.sql`${ident}::text IS DISTINCT FROM ${value}`;
  }

  if (col.kind === "date" || col.kind === "timestamp") {
    const castType = col.kind === "date" ? "date" : "timestamptz";
    if (operator === "equals") return Prisma.sql`${ident} = ${value}::${Prisma.raw(castType)}`;
    if (operator === "before") return Prisma.sql`${ident} < ${value}::${Prisma.raw(castType)}`;
    if (operator === "after") return Prisma.sql`${ident} > ${value}::${Prisma.raw(castType)}`;
    if (operator === "on_or_before")
      return Prisma.sql`${ident} <= ${value}::${Prisma.raw(castType)}`;
    if (operator === "on_or_after")
      return Prisma.sql`${ident} >= ${value}::${Prisma.raw(castType)}`;
  }

  if (col.kind === "text") {
    if (operator === "equals") return Prisma.sql`${ident} = ${value}`;
    if (operator === "not_equals") return Prisma.sql`${ident} IS DISTINCT FROM ${value}`;
    if (operator === "contains") return Prisma.sql`${ident} ILIKE '%' || ${value} || '%'`;
    if (operator === "not_contains")
      return Prisma.sql`(${ident} IS NULL OR ${ident} NOT ILIKE '%' || ${value} || '%')`;
  }

  throw new BadRequestException(`Operator "${operator}" không áp dụng cho field "${fieldKey}"`);
}

/** Build điều kiện WHERE cho 1 custom field (lưu trong custom_fields JSONB). */
function buildCustomFilterSql(
  fieldKey: string,
  fieldType: FieldType,
  condition: FilterCondition,
): Prisma.Sql {
  const { operator } = condition;
  const textExpr = Prisma.sql`(custom_fields ->> ${fieldKey})`;
  const jsonExpr = Prisma.sql`(custom_fields -> ${fieldKey})`;

  if (operator === "is_empty") {
    return Prisma.sql`(${jsonExpr} IS NULL OR ${jsonExpr} = 'null'::jsonb OR ${textExpr} = '')`;
  }
  if (operator === "is_not_empty") {
    return Prisma.sql`(${jsonExpr} IS NOT NULL AND ${jsonExpr} != 'null'::jsonb AND ${textExpr} != '')`;
  }

  if (fieldType === "MULTI_SELECT") {
    const values = asStringArray(condition.value, fieldKey);
    if (operator === "has_any_of") return Prisma.sql`${jsonExpr} ?| ${values}::text[]`;
    if (operator === "has_all_of") return Prisma.sql`${jsonExpr} ?& ${values}::text[]`;
    if (operator === "has_none_of") return Prisma.sql`NOT (${jsonExpr} ?| ${values}::text[])`;
    throw new BadRequestException(`Operator "${operator}" không áp dụng cho field "${fieldKey}"`);
  }

  if (operator === "is_any_of" || operator === "is_none_of") {
    const values = asStringArray(condition.value, fieldKey);
    const expr = Prisma.sql`${textExpr} = ANY(${values}::text[])`;
    return operator === "is_any_of" ? expr : Prisma.sql`NOT (${expr})`;
  }

  const value = asScalar(condition.value, fieldKey);

  if (
    fieldType === "NUMBER" ||
    fieldType === "RATING" ||
    fieldType === "CURRENCY" ||
    fieldType === "PERCENT"
  ) {
    const numExpr = Prisma.sql`(${textExpr})::numeric`;
    if (operator === "equals") return Prisma.sql`${numExpr} = ${value}::numeric`;
    if (operator === "not_equals") return Prisma.sql`${numExpr} IS DISTINCT FROM ${value}::numeric`;
    if (operator === "gt") return Prisma.sql`${numExpr} > ${value}::numeric`;
    if (operator === "gte") return Prisma.sql`${numExpr} >= ${value}::numeric`;
    if (operator === "lt") return Prisma.sql`${numExpr} < ${value}::numeric`;
    if (operator === "lte") return Prisma.sql`${numExpr} <= ${value}::numeric`;
  }

  if (fieldType === "DATE" || fieldType === "DATETIME") {
    const castType = fieldType === "DATE" ? "date" : "timestamptz";
    const dateExpr = Prisma.sql`(${textExpr})::${Prisma.raw(castType)}`;
    if (operator === "equals") return Prisma.sql`${dateExpr} = ${value}::${Prisma.raw(castType)}`;
    if (operator === "before") return Prisma.sql`${dateExpr} < ${value}::${Prisma.raw(castType)}`;
    if (operator === "after") return Prisma.sql`${dateExpr} > ${value}::${Prisma.raw(castType)}`;
    if (operator === "on_or_before")
      return Prisma.sql`${dateExpr} <= ${value}::${Prisma.raw(castType)}`;
    if (operator === "on_or_after")
      return Prisma.sql`${dateExpr} >= ${value}::${Prisma.raw(castType)}`;
  }

  if (fieldType === "CHECKBOX") {
    if (operator === "equals") return Prisma.sql`(${textExpr})::boolean = ${value}::boolean`;
  }

  if (operator === "equals") return Prisma.sql`${textExpr} = ${value}`;
  if (operator === "not_equals") return Prisma.sql`${textExpr} IS DISTINCT FROM ${value}`;
  if (operator === "contains") return Prisma.sql`${textExpr} ILIKE '%' || ${value} || '%'`;
  if (operator === "not_contains")
    return Prisma.sql`(${textExpr} IS NULL OR ${textExpr} NOT ILIKE '%' || ${value} || '%')`;

  throw new BadRequestException(`Operator "${operator}" không áp dụng cho field "${fieldKey}"`);
}

export function buildCandidateFilterSql(
  condition: FilterCondition,
  fieldDefMap: Map<string, FieldDefinition>,
): Prisma.Sql {
  const systemCol = SYSTEM_FIELD_COLUMNS[condition.fieldKey];
  if (systemCol) {
    return buildSystemFilterSql(systemCol, condition);
  }

  const def = fieldDefMap.get(condition.fieldKey);
  if (!def) {
    throw new BadRequestException(`Field "${condition.fieldKey}" không tồn tại`);
  }
  return buildCustomFilterSql(condition.fieldKey, def.fieldType, condition);
}

export function buildCandidateOrderBySql(
  sorts: SortCondition[],
  fieldDefMap: Map<string, FieldDefinition>,
): Prisma.Sql {
  const fragments: Prisma.Sql[] = [];

  for (const sort of sorts) {
    const direction = Prisma.raw(sort.direction === "asc" ? "ASC" : "DESC");
    const systemCol = SYSTEM_FIELD_COLUMNS[sort.fieldKey];

    if (systemCol) {
      fragments.push(Prisma.sql`"${Prisma.raw(systemCol.column)}" ${direction} NULLS LAST`);
      continue;
    }

    const def = fieldDefMap.get(sort.fieldKey);
    if (!def) {
      throw new BadRequestException(`Field "${sort.fieldKey}" không tồn tại`);
    }
    if (
      def.fieldType === "NUMBER" ||
      def.fieldType === "RATING" ||
      def.fieldType === "CURRENCY" ||
      def.fieldType === "PERCENT"
    ) {
      fragments.push(
        Prisma.sql`(custom_fields ->> ${sort.fieldKey})::numeric ${direction} NULLS LAST`,
      );
    } else if (def.fieldType === "DATE" || def.fieldType === "DATETIME") {
      fragments.push(
        Prisma.sql`(custom_fields ->> ${sort.fieldKey})::timestamptz ${direction} NULLS LAST`,
      );
    } else if (def.fieldType === "CHECKBOX") {
      fragments.push(
        Prisma.sql`(custom_fields ->> ${sort.fieldKey})::boolean ${direction} NULLS LAST`,
      );
    } else {
      fragments.push(Prisma.sql`(custom_fields ->> ${sort.fieldKey}) ${direction} NULLS LAST`);
    }
  }

  fragments.push(Prisma.sql`"created_at" DESC`, Prisma.sql`"id" ASC`);
  return Prisma.join(fragments, ", ");
}

export function buildCandidateGroupBySql(
  groupBy: string | undefined,
  fieldDefMap: Map<string, FieldDefinition>,
): Prisma.Sql | null {
  if (!groupBy) return null;
  const systemCol = SYSTEM_FIELD_COLUMNS[groupBy];
  if (systemCol) return Prisma.sql`"${Prisma.raw(systemCol.column)}" ASC NULLS LAST`;

  const def = fieldDefMap.get(groupBy);
  if (!def) throw new BadRequestException(`Field "${groupBy}" không tồn tại`);
  return Prisma.sql`(custom_fields ->> ${groupBy}) ASC NULLS LAST`;
}

export function buildCandidateSearchSql(search: string): Prisma.Sql {
  const pattern = `%${search}%`;
  const conditions = SEARCHABLE_SYSTEM_COLUMNS.map(
    (col) => Prisma.sql`"${Prisma.raw(col)}" ILIKE ${pattern}`,
  );
  return Prisma.sql`(${Prisma.join(conditions, " OR ")})`;
}

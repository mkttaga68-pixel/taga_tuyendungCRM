import { Injectable } from "@nestjs/common";
import { Prisma, type Candidate, type FieldDefinition } from "@prisma/client";
import { evaluateFormula, type RollupAggregation } from "@taga-crm/shared";
import { PrismaService } from "../prisma/prisma.service";

export interface RelationItem {
  id: string;
  label: string;
}

/**
 * Tính giá trị field RELATION/LOOKUP/ROLLUP/FORMULA tại read-time cho 1 trang
 * candidate — KHÔNG lưu vào customFields JSONB (đúng COMPUTED_FIELD_TYPES).
 * Batch tất cả truy vấn theo TRANG (không phải theo từng dòng) để tránh N+1
 * khi list() trả 50-200 dòng/lần — bắt buộc cho mục tiêu hiệu năng triệu bản ghi.
 */
@Injectable()
export class ComputeFieldsService {
  constructor(private readonly prisma: PrismaService) {}

  async computeForRows(
    rows: Candidate[],
    fieldDefs: FieldDefinition[],
  ): Promise<Map<string, Record<string, unknown>>> {
    const result = new Map<string, Record<string, unknown>>();
    for (const row of rows) result.set(row.id, {});

    // isSystem=true + fieldType=RELATION tồn tại cho field hệ thống thật (vd
    // landingPageId — quan hệ Prisma thật, có cột FK riêng) — KHÔNG dùng cơ
    // chế record_links chung này, đã có giá trị riêng trong toDto (candidate.landingPage).
    const relationFields = fieldDefs.filter((f) => f.fieldType === "RELATION" && !f.isSystem);
    const lookupFields = fieldDefs.filter((f) => f.fieldType === "LOOKUP" && !f.isSystem);
    const rollupFields = fieldDefs.filter((f) => f.fieldType === "ROLLUP" && !f.isSystem);
    const formulaFields = fieldDefs.filter((f) => f.fieldType === "FORMULA" && !f.isSystem);
    const fieldDefByKey = new Map(fieldDefs.map((f) => [f.fieldKey, f]));

    const rowIds = rows.map((r) => r.id);

    const links =
      relationFields.length > 0
        ? await this.prisma.recordLink.findMany({
            where: {
              fieldId: { in: relationFields.map((f) => f.id) },
              fromRecordId: { in: rowIds },
            },
          })
        : [];

    const linksByFieldAndRow = new Map<string, string[]>();
    for (const link of links) {
      const key = `${link.fieldId}:${link.fromRecordId}`;
      const arr = linksByFieldAndRow.get(key) ?? [];
      arr.push(link.toRecordId);
      linksByFieldAndRow.set(key, arr);
    }

    // Chỉ hỗ trợ toTableKey="candidates" (self-relation) — bảng duy nhất hiện
    // có Dynamic Field Engine thật. Mở rộng sang bảng khác cần thêm nhánh ở đây.
    const allTargetIds = Array.from(
      new Set(links.filter((l) => l.toTableKey === "candidates").map((l) => l.toRecordId)),
    );
    const targetCandidates =
      allTargetIds.length > 0
        ? await this.prisma.candidate.findMany({ where: { id: { in: allTargetIds } } })
        : [];
    const targetById = new Map(targetCandidates.map((c) => [c.id, c]));

    for (const field of relationFields) {
      for (const row of rows) {
        const toIds = linksByFieldAndRow.get(`${field.id}:${row.id}`) ?? [];
        const items: RelationItem[] = toIds.map((id) => {
          const target = targetById.get(id);
          return { id, label: target?.fullName ?? "(đã xoá)" };
        });
        result.get(row.id)![field.fieldKey] = items;
      }
    }

    for (const field of lookupFields) {
      const options = field.options as {
        relationFieldKey?: string;
        targetFieldKey?: string;
      } | null;
      const relationField = options?.relationFieldKey
        ? fieldDefByKey.get(options.relationFieldKey)
        : undefined;
      const targetFieldDef = options?.targetFieldKey
        ? fieldDefByKey.get(options.targetFieldKey)
        : undefined;
      if (!relationField || relationField.fieldType !== "RELATION" || !options?.targetFieldKey) {
        for (const row of rows) result.get(row.id)![field.fieldKey] = [];
        continue;
      }

      for (const row of rows) {
        const toIds = linksByFieldAndRow.get(`${relationField.id}:${row.id}`) ?? [];
        const values = toIds
          .map((id) => {
            const target = targetById.get(id);
            if (!target) return null;
            return targetFieldDef
              ? this.readRawValue(target, targetFieldDef)
              : (target as unknown as Record<string, unknown>)[options.targetFieldKey!];
          })
          .filter((v) => v !== null && v !== undefined);
        result.get(row.id)![field.fieldKey] = values;
      }
    }

    for (const field of rollupFields) {
      const options = field.options as {
        relationFieldKey?: string;
        targetFieldKey?: string;
        aggregation?: RollupAggregation;
      } | null;
      const relationField = options?.relationFieldKey
        ? fieldDefByKey.get(options.relationFieldKey)
        : undefined;
      const targetFieldDef = options?.targetFieldKey
        ? fieldDefByKey.get(options.targetFieldKey)
        : undefined;
      if (!relationField || relationField.fieldType !== "RELATION" || !options?.aggregation) {
        for (const row of rows) result.get(row.id)![field.fieldKey] = null;
        continue;
      }

      for (const row of rows) {
        const toIds = linksByFieldAndRow.get(`${relationField.id}:${row.id}`) ?? [];
        const rawValues = toIds
          .map((id) => {
            const target = targetById.get(id);
            if (!target || !targetFieldDef) return null;
            return this.readRawValue(target, targetFieldDef);
          })
          .filter((v) => v !== null && v !== undefined);
        result.get(row.id)![field.fieldKey] = this.aggregate(options.aggregation, rawValues);
      }
    }

    for (const field of formulaFields) {
      const expression = (field.options as { expression?: string } | null)?.expression;
      if (!expression) {
        for (const row of rows) result.get(row.id)![field.fieldKey] = null;
        continue;
      }
      for (const row of rows) {
        const values: Record<string, unknown> = {};
        for (const def of fieldDefs) {
          if (def.fieldKey === field.fieldKey) continue;
          if (
            def.fieldType === "RELATION" ||
            def.fieldType === "LOOKUP" ||
            def.fieldType === "ROLLUP"
          ) {
            continue;
          }
          values[def.fieldKey] = this.readRawValue(row, def);
        }
        try {
          result.get(row.id)![field.fieldKey] = evaluateFormula(expression, values);
        } catch {
          result.get(row.id)![field.fieldKey] = "#LỖI";
        }
      }
    }

    return result;
  }

  private aggregate(aggregation: RollupAggregation, rawValues: unknown[]): number {
    if (aggregation === "COUNT") return rawValues.length;
    const numbers = rawValues.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
    if (numbers.length === 0) return 0;
    switch (aggregation) {
      case "SUM":
        return numbers.reduce((sum, n) => sum + n, 0);
      case "AVG":
        return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
      case "MIN":
        return Math.min(...numbers);
      case "MAX":
        return Math.max(...numbers);
    }
  }

  private readRawValue(candidate: Candidate, def: FieldDefinition): unknown {
    if (!def.isSystem) {
      return (candidate.customFields as Prisma.JsonObject | null)?.[def.fieldKey] ?? null;
    }
    return (candidate as unknown as Record<string, unknown>)[def.fieldKey] ?? null;
  }
}

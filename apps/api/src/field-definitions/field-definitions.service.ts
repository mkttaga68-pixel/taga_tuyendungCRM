import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type FieldDefinition } from "@prisma/client";
import {
  extractFormulaFieldKeys,
  formulaFieldOptionsSchema,
  lookupFieldOptionsSchema,
  relationFieldOptionsSchema,
  rollupFieldOptionsSchema,
  type CreateFieldDefinitionInput,
  type FieldDefinitionDto,
  type UpdateFieldDefinitionInput,
} from "@taga-crm/shared";
import { PrismaService } from "../prisma/prisma.service";

/** Ném BadRequestException với message gọn nếu options không khớp schema field-type tương ứng. */
function validateComputedFieldOptions(
  fieldType: CreateFieldDefinitionInput["fieldType"],
  options: Record<string, unknown> | undefined,
): void {
  const schema =
    fieldType === "RELATION"
      ? relationFieldOptionsSchema
      : fieldType === "LOOKUP"
        ? lookupFieldOptionsSchema
        : fieldType === "ROLLUP"
          ? rollupFieldOptionsSchema
          : fieldType === "FORMULA"
            ? formulaFieldOptionsSchema
            : null;
  if (!schema) return;

  const result = schema.safeParse(options ?? {});
  if (!result.success) {
    const detail = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new BadRequestException(`Cấu hình field "${fieldType}" không hợp lệ — ${detail}`);
  }
}

@Injectable()
export class FieldDefinitionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByTable(tableKey: string): Promise<FieldDefinitionDto[]> {
    const fields = await this.prisma.fieldDefinition.findMany({
      where: { tableKey },
      orderBy: { sortOrder: "asc" },
    });
    return fields.map((field) => this.toDto(field));
  }

  async create(
    input: CreateFieldDefinitionInput & { tableKey: string },
    createdBy: string,
  ): Promise<FieldDefinitionDto> {
    const existing = await this.prisma.fieldDefinition.findUnique({
      where: { tableKey_fieldKey: { tableKey: input.tableKey, fieldKey: input.fieldKey } },
    });
    if (existing) {
      throw new BadRequestException(
        `Field "${input.fieldKey}" đã tồn tại trong bảng "${input.tableKey}"`,
      );
    }

    validateComputedFieldOptions(input.fieldType, input.options);
    if (input.fieldType === "LOOKUP" || input.fieldType === "ROLLUP") {
      const options = input.options as { relationFieldKey?: string; targetFieldKey?: string };
      const relationField = await this.prisma.fieldDefinition.findUnique({
        where: {
          tableKey_fieldKey: { tableKey: input.tableKey, fieldKey: options.relationFieldKey! },
        },
      });
      if (!relationField || relationField.fieldType !== "RELATION") {
        throw new BadRequestException(
          `relationFieldKey "${options.relationFieldKey}" phải là field kiểu RELATION đã tồn tại trong bảng "${input.tableKey}"`,
        );
      }
      const relationOptions = relationField.options as { toTableKey?: string };
      const targetField = await this.prisma.fieldDefinition.findUnique({
        where: {
          tableKey_fieldKey: {
            tableKey: relationOptions.toTableKey ?? "",
            fieldKey: options.targetFieldKey!,
          },
        },
      });
      if (!targetField) {
        throw new BadRequestException(
          `targetFieldKey "${options.targetFieldKey}" không tồn tại trong bảng "${relationOptions.toTableKey}"`,
        );
      }
    }
    if (input.fieldType === "FORMULA") {
      const expression = (input.options as { expression?: string }).expression ?? "";
      const referencedKeys = extractFormulaFieldKeys(expression);
      const existingFields = await this.prisma.fieldDefinition.findMany({
        where: { tableKey: input.tableKey, fieldKey: { in: referencedKeys } },
        select: { fieldKey: true },
      });
      const existingKeys = new Set(existingFields.map((f) => f.fieldKey));
      const missing = referencedKeys.filter((k) => !existingKeys.has(k));
      if (missing.length > 0) {
        throw new BadRequestException(
          `Công thức tham chiếu field không tồn tại: ${missing.map((k) => `{{${k}}}`).join(", ")}`,
        );
      }
    }

    const maxSortOrder = await this.prisma.fieldDefinition.aggregate({
      where: { tableKey: input.tableKey },
      _max: { sortOrder: true },
    });

    const created = await this.prisma.fieldDefinition.create({
      data: {
        tableKey: input.tableKey,
        fieldKey: input.fieldKey,
        label: input.label,
        fieldType: input.fieldType,
        options: (input.options ?? {}) as Prisma.InputJsonValue,
        isRequired: input.isRequired ?? false,
        isSystem: false,
        sortOrder: (maxSortOrder._max.sortOrder ?? 0) + 1,
        createdBy,
      },
    });
    return this.toDto(created);
  }

  async update(id: string, input: UpdateFieldDefinitionInput): Promise<FieldDefinitionDto> {
    const existing = await this.ensureExists(id);
    if (input.options !== undefined) {
      validateComputedFieldOptions(existing.fieldType, input.options);
    }
    const updated = await this.prisma.fieldDefinition.update({
      where: { id },
      data: input as Prisma.FieldDefinitionUpdateInput,
    });
    return this.toDto(updated);
  }

  async remove(id: string): Promise<{ success: true }> {
    const field = await this.ensureExists(id);
    if (field.isSystem) {
      throw new BadRequestException("Không thể xoá field hệ thống");
    }
    await this.prisma.fieldDefinition.delete({ where: { id } });
    return { success: true };
  }

  async reorder(tableKey: string, orderedIds: string[]): Promise<void> {
    const fields = await this.prisma.fieldDefinition.findMany({
      where: { tableKey, id: { in: orderedIds } },
      select: { id: true },
    });
    if (fields.length !== orderedIds.length) {
      throw new BadRequestException("Danh sách field không khớp với bảng hiện tại");
    }

    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.fieldDefinition.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
  }

  private async ensureExists(id: string): Promise<FieldDefinition> {
    const field = await this.prisma.fieldDefinition.findUnique({ where: { id } });
    if (!field) {
      throw new NotFoundException("Không tìm thấy field");
    }
    return field;
  }

  private toDto(field: FieldDefinition): FieldDefinitionDto {
    return {
      id: field.id,
      tableKey: field.tableKey,
      fieldKey: field.fieldKey,
      label: field.label,
      fieldType: field.fieldType,
      options: (field.options as Record<string, unknown> | null) ?? null,
      sortOrder: field.sortOrder,
      width: field.width,
      isFrozen: field.isFrozen,
      isHidden: field.isHidden,
      isRequired: field.isRequired,
      isSystem: field.isSystem,
    };
  }
}

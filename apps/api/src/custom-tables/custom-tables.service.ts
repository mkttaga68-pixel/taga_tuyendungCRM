import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  type CreateCustomTableInput,
  type UpdateCustomTableInput,
  type CreateCustomRecordInput,
  type UpdateCustomRecordInput,
  type CustomTableDto,
  type CustomRecordDto,
  type CustomRecordListResponse,
} from "@taga-crm/shared";
import { PrismaService } from "../prisma/prisma.service";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60);
}

function toTableDto(t: {
  id: string;
  tableKey: string;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): CustomTableDto {
  return {
    id: t.id,
    tableKey: t.tableKey,
    name: t.name,
    description: t.description,
    sortOrder: t.sortOrder,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

function toRecordDto(r: {
  id: string;
  tableId: string;
  data: unknown;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): CustomRecordDto {
  return {
    id: r.id,
    tableId: r.tableId,
    data: (r.data as Record<string, unknown>) ?? {},
    sortOrder: r.sortOrder,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

@Injectable()
export class CustomTablesService {
  constructor(private readonly prisma: PrismaService) {}

  async listTables(): Promise<CustomTableDto[]> {
    const tables = await this.prisma.customTable.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return tables.map(toTableDto);
  }

  async createTable(body: CreateCustomTableInput, userId: string): Promise<CustomTableDto> {
    const base = slugify(body.name);
    let tableKey = base || "table";

    // Ensure unique key by appending counter if needed
    const existing = await this.prisma.customTable.findMany({
      where: { tableKey: { startsWith: tableKey } },
      select: { tableKey: true },
    });
    if (existing.length > 0) {
      const keys = new Set(existing.map((e) => e.tableKey));
      if (keys.has(tableKey)) {
        let i = 2;
        while (keys.has(`${tableKey}_${i}`)) i++;
        tableKey = `${tableKey}_${i}`;
      }
    }

    const maxOrder = await this.prisma.customTable.aggregate({ _max: { sortOrder: true } });
    const sortOrder = (maxOrder._max.sortOrder ?? 0) + 1;

    const created = await this.prisma.customTable.create({
      data: {
        tableKey,
        name: body.name,
        description: body.description ?? null,
        sortOrder,
        createdBy: userId,
      },
    });
    return toTableDto(created);
  }

  async getTable(tableKey: string): Promise<CustomTableDto> {
    const table = await this.prisma.customTable.findUnique({ where: { tableKey } });
    if (!table) throw new NotFoundException("Không tìm thấy bảng");
    return toTableDto(table);
  }

  async updateTable(
    tableKey: string,
    body: UpdateCustomTableInput,
  ): Promise<CustomTableDto> {
    const table = await this.prisma.customTable.findUnique({ where: { tableKey } });
    if (!table) throw new NotFoundException("Không tìm thấy bảng");

    const updated = await this.prisma.customTable.update({
      where: { tableKey },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
      },
    });
    return toTableDto(updated);
  }

  async deleteTable(tableKey: string): Promise<void> {
    const table = await this.prisma.customTable.findUnique({ where: { tableKey } });
    if (!table) throw new NotFoundException("Không tìm thấy bảng");
    await this.prisma.customTable.delete({ where: { tableKey } });
  }

  async listRecords(
    tableKey: string,
    offset: number,
    limit: number,
  ): Promise<CustomRecordListResponse> {
    const table = await this.prisma.customTable.findUnique({ where: { tableKey } });
    if (!table) throw new NotFoundException("Không tìm thấy bảng");

    const [records, total] = await this.prisma.$transaction([
      this.prisma.customRecord.findMany({
        where: { tableId: table.id, deletedAt: null },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        skip: offset,
        take: limit,
      }),
      this.prisma.customRecord.count({ where: { tableId: table.id, deletedAt: null } }),
    ]);

    return {
      items: records.map(toRecordDto),
      total,
      hasMore: offset + records.length < total,
    };
  }

  async createRecord(
    tableKey: string,
    body: CreateCustomRecordInput,
    userId: string,
  ): Promise<CustomRecordDto> {
    const table = await this.prisma.customTable.findUnique({ where: { tableKey } });
    if (!table) throw new NotFoundException("Không tìm thấy bảng");

    const maxOrder = await this.prisma.customRecord.aggregate({
      where: { tableId: table.id, deletedAt: null },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxOrder._max.sortOrder ?? 0) + 1;

    const created = await this.prisma.customRecord.create({
      data: {
        tableId: table.id,
        data: (body.data ?? {}) as Prisma.InputJsonValue,
        sortOrder,
        createdBy: userId,
      },
    });
    return toRecordDto(created);
  }

  async updateRecord(
    recordId: string,
    body: UpdateCustomRecordInput,
  ): Promise<CustomRecordDto> {
    const record = await this.prisma.customRecord.findUnique({ where: { id: recordId } });
    if (!record || record.deletedAt) throw new NotFoundException("Không tìm thấy bản ghi");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const merged = { ...(record.data as any), ...body.data } as Prisma.InputJsonValue;
    const updated = await this.prisma.customRecord.update({
      where: { id: recordId },
      data: { data: merged },
    });
    return toRecordDto(updated);
  }

  async deleteRecord(recordId: string): Promise<void> {
    const record = await this.prisma.customRecord.findUnique({ where: { id: recordId } });
    if (!record || record.deletedAt) throw new NotFoundException("Không tìm thấy bản ghi");

    await this.prisma.customRecord.update({
      where: { id: recordId },
      data: { deletedAt: new Date() },
    });
  }
}

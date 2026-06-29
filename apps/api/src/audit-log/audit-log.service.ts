import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuditLogDto, AuditLogQuery } from "@taga-crm/shared";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditChangeInput {
  fieldName: string | null;
  oldValue: unknown;
  newValue: unknown;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async recordCreate(
    entityTable: string,
    entityId: string,
    actorId: string | null,
    snapshot: unknown,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        entityTable,
        entityId,
        action: "CREATE",
        fieldName: null,
        oldValue: Prisma.JsonNull,
        newValue: snapshot ?? Prisma.JsonNull,
        changedBy: actorId,
      },
    });
  }

  async recordUpdate(
    entityTable: string,
    entityId: string,
    actorId: string | null,
    changes: AuditChangeInput[],
  ): Promise<void> {
    if (changes.length === 0) return;
    await this.prisma.auditLog.createMany({
      data: changes.map((change) => ({
        entityTable,
        entityId,
        action: "UPDATE" as const,
        fieldName: change.fieldName,
        oldValue: change.oldValue ?? Prisma.JsonNull,
        newValue: change.newValue ?? Prisma.JsonNull,
        changedBy: actorId,
      })),
    });
  }

  async recordDelete(entityTable: string, entityId: string, actorId: string): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        entityTable,
        entityId,
        action: "DELETE",
        fieldName: null,
        oldValue: Prisma.JsonNull,
        newValue: Prisma.JsonNull,
        changedBy: actorId,
      },
    });
  }

  async list(query: AuditLogQuery): Promise<{ items: AuditLogDto[]; hasMore: boolean }> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const offset = Math.max(query.offset ?? 0, 0);

    const where: Prisma.AuditLogWhereInput = {
      ...(query.entityTable ? { entityTable: query.entityTable } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.changedBy ? { changedBy: query.changedBy } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            changedAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: { changedAt: "desc" },
      take: limit + 1,
      skip: offset,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const actorIds = Array.from(
      new Set(page.map((r) => r.changedBy).filter((id): id is string => !!id)),
    );
    const actors = actorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, fullName: true },
        })
      : [];
    const actorById = new Map(actors.map((a) => [a.id, a.fullName]));

    const candidateIds = Array.from(
      new Set(page.filter((r) => r.entityTable === "candidates").map((r) => r.entityId)),
    );
    const candidates = candidateIds.length
      ? await this.prisma.candidate.findMany({
          where: { id: { in: candidateIds } },
          select: { id: true, fullName: true },
        })
      : [];
    const candidateNameById = new Map(candidates.map((c) => [c.id, c.fullName]));

    return {
      items: page.map((row) => ({
        id: row.id,
        entityTable: row.entityTable,
        entityId: row.entityId,
        entityLabel:
          row.entityTable === "candidates" ? (candidateNameById.get(row.entityId) ?? null) : null,
        action: row.action,
        fieldName: row.fieldName,
        oldValue: row.oldValue,
        newValue: row.newValue,
        changedBy: row.changedBy,
        changedByName: row.changedBy ? (actorById.get(row.changedBy) ?? null) : null,
        changedAt: row.changedAt.toISOString(),
      })),
      hasMore,
    };
  }
}

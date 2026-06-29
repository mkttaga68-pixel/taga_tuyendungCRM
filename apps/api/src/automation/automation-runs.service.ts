import { Injectable } from "@nestjs/common";
import type { AutomationRunDto, AutomationRunListResponse } from "@taga-crm/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AutomationRunsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    workflowId: string,
    offset: number,
    limit: number,
  ): Promise<AutomationRunListResponse> {
    const rows = await this.prisma.automationRun.findMany({
      where: { workflowId },
      include: { logs: { orderBy: { startedAt: "asc" } } },
      orderBy: { startedAt: "desc" },
      take: limit + 1,
      skip: offset,
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: page.map((run) => ({
        id: run.id,
        workflowId: run.workflowId,
        triggerRecordTable: run.triggerRecordTable,
        triggerRecordId: run.triggerRecordId,
        status: run.status,
        startedAt: run.startedAt.toISOString(),
        finishedAt: run.finishedAt?.toISOString() ?? null,
        errorMessage: run.errorMessage,
        logs: run.logs.map((log) => ({
          id: log.id,
          nodeKey: log.nodeKey,
          status: log.status,
          input: log.input,
          output: log.output,
          startedAt: log.startedAt.toISOString(),
          finishedAt: log.finishedAt?.toISOString() ?? null,
          errorMessage: log.errorMessage,
        })),
      })),
      hasMore,
    };
  }

  async findOne(id: string): Promise<AutomationRunDto | null> {
    const run = await this.prisma.automationRun.findUnique({
      where: { id },
      include: { logs: { orderBy: { startedAt: "asc" } } },
    });
    if (!run) return null;
    return {
      id: run.id,
      workflowId: run.workflowId,
      triggerRecordTable: run.triggerRecordTable,
      triggerRecordId: run.triggerRecordId,
      status: run.status,
      startedAt: run.startedAt.toISOString(),
      finishedAt: run.finishedAt?.toISOString() ?? null,
      errorMessage: run.errorMessage,
      logs: run.logs.map((log) => ({
        id: log.id,
        nodeKey: log.nodeKey,
        status: log.status,
        input: log.input,
        output: log.output,
        startedAt: log.startedAt.toISOString(),
        finishedAt: log.finishedAt?.toISOString() ?? null,
        errorMessage: log.errorMessage,
      })),
    };
  }
}

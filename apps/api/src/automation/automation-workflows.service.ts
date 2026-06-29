import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  AccessTokenPayload,
  AutomationWorkflowDto,
  AutomationWorkflowGraphDto,
  CreateWorkflowInput,
  SaveWorkflowGraphInput,
  UpdateWorkflowInput,
} from "@taga-crm/shared";
import { PrismaService } from "../prisma/prisma.service";

const WORKFLOW_INCLUDE = {
  creator: { select: { id: true, fullName: true } },
  runs: { orderBy: { startedAt: "desc" as const }, take: 1 },
} satisfies Prisma.AutomationWorkflowInclude;

@Injectable()
export class AutomationWorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<AutomationWorkflowDto[]> {
    const rows = await this.prisma.automationWorkflow.findMany({
      include: WORKFLOW_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.toDto(row));
  }

  async findOne(id: string): Promise<AutomationWorkflowDto> {
    const row = await this.getOrThrow(id);
    return this.toDto(row);
  }

  async create(
    input: CreateWorkflowInput,
    actor: AccessTokenPayload,
  ): Promise<AutomationWorkflowDto> {
    const created = await this.prisma.automationWorkflow.create({
      data: {
        name: input.name,
        triggerType: input.triggerType,
        triggerConfig: (input.triggerConfig ?? {}) as Prisma.InputJsonValue,
        isActive: false,
        createdBy: actor.sub,
      },
      include: WORKFLOW_INCLUDE,
    });
    return this.toDto(created);
  }

  async update(id: string, input: UpdateWorkflowInput): Promise<AutomationWorkflowDto> {
    await this.getOrThrow(id);
    const updated = await this.prisma.automationWorkflow.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.triggerType !== undefined ? { triggerType: input.triggerType } : {}),
        ...(input.triggerConfig !== undefined
          ? { triggerConfig: input.triggerConfig as Prisma.InputJsonValue }
          : {}),
      },
      include: WORKFLOW_INCLUDE,
    });
    return this.toDto(updated);
  }

  async remove(id: string): Promise<{ success: true }> {
    await this.getOrThrow(id);
    await this.prisma.automationWorkflow.delete({ where: { id } });
    return { success: true };
  }

  async getGraph(id: string): Promise<AutomationWorkflowGraphDto> {
    await this.getOrThrow(id);
    const [nodes, edges] = await Promise.all([
      this.prisma.automationNode.findMany({ where: { workflowId: id } }),
      this.prisma.automationEdge.findMany({ where: { workflowId: id } }),
    ]);
    return {
      nodes: nodes.map((n) => ({
        nodeKey: n.nodeKey,
        type: n.type,
        config: (n.config as Record<string, unknown>) ?? {},
        positionX: n.positionX,
        positionY: n.positionY,
        isEntry: n.isEntry,
      })),
      edges: edges.map((e) => ({
        fromNodeKey: e.fromNodeKey,
        toNodeKey: e.toNodeKey,
        conditionLabel: e.conditionLabel ?? undefined,
      })),
    };
  }

  /** Lưu toàn bộ graph 1 lần — thay hết node/edge cũ, đơn giản & đúng với cách canvas lưu "snapshot". */
  async saveGraph(id: string, input: SaveWorkflowGraphInput): Promise<AutomationWorkflowGraphDto> {
    await this.getOrThrow(id);

    const nodeKeys = new Set(input.nodes.map((n) => n.nodeKey));
    if (nodeKeys.size !== input.nodes.length) {
      throw new BadRequestException("nodeKey bị trùng trong graph");
    }
    for (const edge of input.edges) {
      if (!nodeKeys.has(edge.fromNodeKey) || !nodeKeys.has(edge.toNodeKey)) {
        throw new BadRequestException("Edge tham chiếu tới nodeKey không tồn tại");
      }
    }
    const entryCount = input.nodes.filter((n) => n.isEntry).length;
    if (input.nodes.length > 0 && entryCount !== 1) {
      throw new BadRequestException("Graph phải có đúng 1 node bắt đầu (isEntry)");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.automationEdge.deleteMany({ where: { workflowId: id } });
      await tx.automationNode.deleteMany({ where: { workflowId: id } });
      if (input.nodes.length > 0) {
        await tx.automationNode.createMany({
          data: input.nodes.map((n) => ({
            workflowId: id,
            nodeKey: n.nodeKey,
            type: n.type,
            config: n.config as Prisma.InputJsonValue,
            positionX: n.positionX,
            positionY: n.positionY,
            isEntry: n.isEntry ?? false,
          })),
        });
      }
      if (input.edges.length > 0) {
        await tx.automationEdge.createMany({
          data: input.edges.map((e) => ({
            workflowId: id,
            fromNodeKey: e.fromNodeKey,
            toNodeKey: e.toNodeKey,
            conditionLabel: e.conditionLabel ?? null,
          })),
        });
      }
    });

    return this.getGraph(id);
  }

  private async getOrThrow(id: string) {
    const row = await this.prisma.automationWorkflow.findUnique({
      where: { id },
      include: WORKFLOW_INCLUDE,
    });
    if (!row) throw new NotFoundException("Không tìm thấy Automation Workflow");
    return row;
  }

  private toDto(
    row: Prisma.AutomationWorkflowGetPayload<{ include: typeof WORKFLOW_INCLUDE }>,
  ): AutomationWorkflowDto {
    const lastRun = row.runs[0];
    return {
      id: row.id,
      name: row.name,
      isActive: row.isActive,
      triggerType: row.triggerType,
      triggerConfig: (row.triggerConfig as Record<string, unknown>) ?? {},
      creator: row.creator,
      lastRunStatus: lastRun?.status ?? null,
      lastRunAt: lastRun?.startedAt.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

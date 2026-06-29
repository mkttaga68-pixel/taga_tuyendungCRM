import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  ROLES_WITH_FULL_VISIBILITY,
  type AccessTokenPayload,
  type CommentDto,
  type CreateCommentInput,
} from "@taga-crm/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CandidatesService } from "../candidates/candidates.service";

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly candidatesService: CandidatesService,
  ) {}

  async list(
    viewer: AccessTokenPayload,
    entityTable: string,
    entityId: string,
  ): Promise<CommentDto[]> {
    await this.assertEntityVisible(viewer, entityTable, entityId);
    const rows = await this.prisma.comment.findMany({
      where: { entityTable, entityId, deletedAt: null },
      include: { author: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      entityTable: row.entityTable,
      entityId: row.entityId,
      author: row.author,
      bodyText: row.bodyText,
      mentions: row.mentions,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async create(viewer: AccessTokenPayload, input: CreateCommentInput): Promise<CommentDto> {
    await this.assertEntityVisible(viewer, input.entityTable, input.entityId);

    const created = await this.prisma.comment.create({
      data: {
        entityTable: input.entityTable,
        entityId: input.entityId,
        authorId: viewer.sub,
        bodyText: input.bodyText,
        mentions: input.mentions ?? [],
      },
      include: { author: { select: { id: true, fullName: true } } },
    });

    return {
      id: created.id,
      entityTable: created.entityTable,
      entityId: created.entityId,
      author: created.author,
      bodyText: created.bodyText,
      mentions: created.mentions,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  async remove(viewer: AccessTokenPayload, id: string): Promise<{ success: true }> {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment || comment.deletedAt) {
      throw new NotFoundException("Không tìm thấy comment");
    }
    const canManageOthers = ROLES_WITH_FULL_VISIBILITY.has(viewer.role) && viewer.role !== "VIEWER";
    if (comment.authorId !== viewer.sub && !canManageOthers) {
      throw new ForbiddenException("Bạn chỉ xoá được comment của chính mình");
    }
    await this.prisma.comment.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  private async assertEntityVisible(
    viewer: AccessTokenPayload,
    entityTable: string,
    entityId: string,
  ): Promise<void> {
    if (entityTable === "candidates") {
      await this.candidatesService.assertCandidateVisible(viewer, entityId);
    }
  }
}

import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type AdSpend } from "@prisma/client";
import type { AdSpendDto, AdSpendListQuery, CreateAdSpendInput } from "@taga-crm/shared";
import { PrismaService } from "../prisma/prisma.service";

const AD_SPEND_INCLUDE = {
  landingPage: { select: { id: true, name: true } },
} satisfies Prisma.AdSpendInclude;

type AdSpendWithRelations = AdSpend & { landingPage: { id: string; name: string } | null };

@Injectable()
export class AdSpendService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdSpendListQuery): Promise<{ items: AdSpendDto[]; hasMore: boolean }> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const offset = Math.max(query.offset ?? 0, 0);

    const where: Prisma.AdSpendWhereInput = {
      ...(query.landingPageId ? { landingPageId: query.landingPageId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            date: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const rows = await this.prisma.adSpend.findMany({
      where,
      include: AD_SPEND_INCLUDE,
      orderBy: { date: "desc" },
      take: limit + 1,
      skip: offset,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return { items: page.map((row) => this.toDto(row)), hasMore };
  }

  async create(input: CreateAdSpendInput, actorId: string): Promise<AdSpendDto> {
    const created = await this.prisma.adSpend.create({
      data: {
        landingPageId: input.landingPageId,
        channel: input.channel,
        date: new Date(input.date),
        amount: input.amount,
        currency: input.currency,
        source: input.source,
        createdBy: actorId,
      },
      include: AD_SPEND_INCLUDE,
    });
    return this.toDto(created);
  }

  async remove(id: string): Promise<{ success: true }> {
    const existing = await this.prisma.adSpend.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Không tìm thấy chi phí quảng cáo");
    await this.prisma.adSpend.delete({ where: { id } });
    return { success: true };
  }

  private toDto(row: AdSpendWithRelations): AdSpendDto {
    return {
      id: row.id,
      landingPageId: row.landingPageId,
      landingPageName: row.landingPage?.name ?? null,
      channel: row.channel,
      date: row.date.toISOString().slice(0, 10),
      amount: Number(row.amount),
      currency: row.currency,
      source: row.source,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

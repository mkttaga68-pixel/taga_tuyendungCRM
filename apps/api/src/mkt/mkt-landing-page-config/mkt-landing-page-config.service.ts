import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { CreateMktLandingPageConfigInput, MktLandingPageConfigDto } from "@taga-crm/shared";

@Injectable()
export class MktLandingPageConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async findByLandingPage(landingPageId: string): Promise<MktLandingPageConfigDto | null> {
    const r = await this.prisma.mktLandingPageConfig.findUnique({ where: { landingPageId } });
    if (!r) return null;
    return {
      landingPageId: r.landingPageId,
      defaultListId: r.defaultListId,
      defaultCampaignId: r.defaultCampaignId,
      defaultTagIds: r.defaultTagIds,
      sourceLabel: r.sourceLabel,
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  async upsert(
    landingPageId: string,
    input: CreateMktLandingPageConfigInput,
  ): Promise<MktLandingPageConfigDto> {
    const r = await this.prisma.mktLandingPageConfig.upsert({
      where: { landingPageId },
      create: {
        landingPageId,
        defaultListId: input.defaultListId ?? null,
        defaultCampaignId: input.defaultCampaignId ?? null,
        defaultTagIds: input.defaultTagIds ?? [],
        sourceLabel: input.sourceLabel ?? null,
      },
      update: {
        defaultListId: input.defaultListId ?? null,
        defaultCampaignId: input.defaultCampaignId ?? null,
        defaultTagIds: input.defaultTagIds ?? [],
        sourceLabel: input.sourceLabel ?? null,
      },
    });
    return {
      landingPageId: r.landingPageId,
      defaultListId: r.defaultListId,
      defaultCampaignId: r.defaultCampaignId,
      defaultTagIds: r.defaultTagIds,
      sourceLabel: r.sourceLabel,
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}

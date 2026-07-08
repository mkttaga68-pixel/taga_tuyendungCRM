import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, type LandingPage } from "@prisma/client";
import type {
  AccessTokenPayload,
  CreateLandingPageInput,
  FormSubmissionDto,
  FormSubmissionQuery,
  LandingPageDto,
  LandingPageTrackingConfig,
  LandingPageWithApiKeyDto,
  UpdateLandingPageInput,
} from "@taga-crm/shared";
import { PrismaService } from "../prisma/prisma.service";
import { generateOpaqueToken, sha256Hex } from "../common/utils/hash.util";

const LANDING_PAGE_INCLUDE = {
  creator: { select: { id: true, fullName: true } },
  _count: { select: { submissions: true, candidates: true } },
  mktConfig: {
    select: {
      defaultListId: true,
      defaultList: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.LandingPageInclude;

type LandingPageWithRelations = LandingPage & {
  creator: { id: string; fullName: string } | null;
  _count: { submissions: number; candidates: number };
  mktConfig: {
    defaultListId: string | null;
    defaultList: { id: string; name: string } | null;
  } | null;
};

@Injectable()
export class LandingPagesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<LandingPageDto[]> {
    const rows = await this.prisma.landingPage.findMany({
      where: { deletedAt: null },
      include: LANDING_PAGE_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.toDto(row));
  }

  async findOne(id: string): Promise<LandingPageDto> {
    const row = await this.getOrThrow(id);
    return this.toDto(row);
  }

  /** Dùng nội bộ bởi IngestionService — cần cả apiKeyHash/status, không lộ ra DTO public. */
  async findActiveBySlugRaw(slug: string): Promise<LandingPage | null> {
    return this.prisma.landingPage.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  async create(
    input: CreateLandingPageInput,
    actor: AccessTokenPayload,
  ): Promise<LandingPageWithApiKeyDto> {
    const existing = await this.prisma.landingPage.findUnique({ where: { slug: input.slug } });
    if (existing) {
      throw new ConflictException(`Slug "${input.slug}" đã được dùng`);
    }

    const rawApiKey = generateOpaqueToken();
    const created = await this.prisma.landingPage.create({
      data: {
        name: input.name,
        slug: input.slug,
        url: input.url,
        domain: input.domain || null,
        description: input.description || null,
        status: input.status ?? "DRAFT",
        trackingConfig: input.trackingConfig ?? {},
        apiKeyHash: sha256Hex(rawApiKey),
        createdBy: actor.sub,
      },
      include: LANDING_PAGE_INCLUDE,
    });

    return { ...this.toDto(created), apiKey: rawApiKey };
  }

  async update(id: string, input: UpdateLandingPageInput): Promise<LandingPageDto> {
    await this.getOrThrow(id);
    const updated = await this.prisma.landingPage.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.url !== undefined ? { url: input.url } : {}),
        ...(input.domain !== undefined ? { domain: input.domain || null } : {}),
        ...(input.description !== undefined ? { description: input.description || null } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.trackingConfig !== undefined ? { trackingConfig: input.trackingConfig } : {}),
      },
      include: LANDING_PAGE_INCLUDE,
    });
    return this.toDto(updated);
  }

  async remove(id: string): Promise<void> {
    await this.getOrThrow(id);
    await this.prisma.landingPage.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async regenerateApiKey(id: string): Promise<LandingPageWithApiKeyDto> {
    const row = await this.getOrThrow(id);
    const rawApiKey = generateOpaqueToken();
    const updated = await this.prisma.landingPage.update({
      where: { id: row.id },
      data: { apiKeyHash: sha256Hex(rawApiKey) },
      include: LANDING_PAGE_INCLUDE,
    });
    return { ...this.toDto(updated), apiKey: rawApiKey };
  }

  async listSubmissions(
    id: string,
    query: FormSubmissionQuery,
  ): Promise<{ items: FormSubmissionDto[]; hasMore: boolean }> {
    await this.getOrThrow(id);
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const offset = Math.max(query.offset ?? 0, 0);

    const rows = await this.prisma.formSubmission.findMany({
      where: {
        landingPageId: id,
        ...(query.processingStatus ? { processingStatus: query.processingStatus } : {}),
      },
      include: { candidate: { select: { id: true, fullName: true } } },
      orderBy: { submittedAt: "desc" },
      take: limit + 1,
      skip: offset,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: page.map((row) => ({
        id: row.id,
        landingPageId: row.landingPageId,
        formId: row.formId,
        rawPayload: row.rawPayload,
        ip: row.ip,
        userAgent: row.userAgent,
        device: row.device,
        os: row.os,
        browser: row.browser,
        referrer: row.referrer,
        utmSource: row.utmSource,
        utmMedium: row.utmMedium,
        utmCampaign: row.utmCampaign,
        utmContent: row.utmContent,
        utmTerm: row.utmTerm,
        fbc: row.fbc,
        fbp: row.fbp,
        ttclid: row.ttclid,
        submittedAt: row.submittedAt.toISOString(),
        candidateId: row.candidateId,
        candidateName: row.candidate?.fullName ?? null,
        processingStatus: row.processingStatus,
        errorMessage: row.errorMessage,
      })),
      hasMore,
    };
  }

  private async getOrThrow(id: string): Promise<LandingPageWithRelations> {
    const row = await this.prisma.landingPage.findUnique({
      where: { id },
      include: LANDING_PAGE_INCLUDE,
    });
    if (!row || row.deletedAt) {
      throw new NotFoundException("Không tìm thấy Landing Page");
    }
    return row;
  }

  private toDto(row: LandingPageWithRelations): LandingPageDto {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      url: row.url,
      domain: row.domain,
      status: row.status,
      description: row.description,
      trackingConfig: (row.trackingConfig as LandingPageTrackingConfig | null) ?? {},
      creator: row.creator,
      submissionCount: row._count.submissions,
      candidateCount: row._count.candidates,
      defaultListId: row.mktConfig?.defaultListId ?? null,
      defaultListName: row.mktConfig?.defaultList?.name ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

export class LandingPageNotActiveError extends BadRequestException {
  constructor() {
    super("Landing Page không ở trạng thái ACTIVE");
  }
}

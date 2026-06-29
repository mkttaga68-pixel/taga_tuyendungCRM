import { Injectable, NotFoundException } from "@nestjs/common";
import type { LandingPageForm } from "@prisma/client";
import type { FormSchemaShape, LandingPageFormDto } from "@taga-crm/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class LandingPageFormsService {
  constructor(private readonly prisma: PrismaService) {}

  async listVersions(landingPageId: string): Promise<LandingPageFormDto[]> {
    const rows = await this.prisma.landingPageForm.findMany({
      where: { landingPageId },
      orderBy: { version: "desc" },
    });
    return rows.map((row) => this.toDto(row));
  }

  async getActive(landingPageId: string): Promise<LandingPageFormDto | null> {
    const row = await this.prisma.landingPageForm.findFirst({
      where: { landingPageId, isActive: true },
      orderBy: { version: "desc" },
    });
    return row ? this.toDto(row) : null;
  }

  /** Dùng nội bộ bởi IngestionService — trả raw Prisma row, không qua DTO. */
  async getActiveRaw(landingPageId: string): Promise<LandingPageForm | null> {
    return this.prisma.landingPageForm.findFirst({
      where: { landingPageId, isActive: true },
      orderBy: { version: "desc" },
    });
  }

  /**
   * Tạo version mới và đánh dấu version cũ inactive trong 1 transaction —
   * giữ lịch sử đầy đủ (khớp các form_submission cũ vẫn trỏ formId đúng
   * version đã active lúc submit), không sửa đè version đang dùng.
   */
  async createVersion(landingPageId: string, schema: FormSchemaShape): Promise<LandingPageFormDto> {
    const landingPage = await this.prisma.landingPage.findUnique({ where: { id: landingPageId } });
    if (!landingPage || landingPage.deletedAt) {
      throw new NotFoundException("Không tìm thấy Landing Page");
    }

    const latest = await this.prisma.landingPageForm.findFirst({
      where: { landingPageId },
      orderBy: { version: "desc" },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.landingPageForm.updateMany({
        where: { landingPageId, isActive: true },
        data: { isActive: false },
      });
      return tx.landingPageForm.create({
        data: {
          landingPageId,
          version: nextVersion,
          schema: schema,
          isActive: true,
        },
      });
    });

    return this.toDto(created);
  }

  private toDto(row: LandingPageForm): LandingPageFormDto {
    return {
      id: row.id,
      landingPageId: row.landingPageId,
      version: row.version,
      schema: row.schema as unknown as FormSchemaShape,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

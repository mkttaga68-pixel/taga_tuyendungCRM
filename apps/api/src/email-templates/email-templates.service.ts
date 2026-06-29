import { Injectable, NotFoundException } from "@nestjs/common";
import type { EmailTemplate } from "@prisma/client";
import type {
  CreateEmailTemplateInput,
  EmailBlock,
  EmailTemplateDto,
  UpdateEmailTemplateInput,
} from "@taga-crm/shared";
import { PrismaService } from "../prisma/prisma.service";
import { renderEmailTemplateToHtml } from "./mjml-renderer";

@Injectable()
export class EmailTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<EmailTemplateDto[]> {
    const rows = await this.prisma.emailTemplate.findMany({ orderBy: { updatedAt: "desc" } });
    return rows.map((row) => this.toDto(row));
  }

  async findById(id: string): Promise<EmailTemplateDto> {
    const row = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Không tìm thấy mẫu email");
    return this.toDto(row);
  }

  async create(input: CreateEmailTemplateInput, actorId: string): Promise<EmailTemplateDto> {
    const created = await this.prisma.emailTemplate.create({
      data: {
        name: input.name,
        subject: input.subject,
        blocks: input.blocks,
        createdBy: actorId,
      },
    });
    return this.toDto(created);
  }

  async update(id: string, input: UpdateEmailTemplateInput): Promise<EmailTemplateDto> {
    await this.findById(id);
    const updated = await this.prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.subject !== undefined ? { subject: input.subject } : {}),
        ...(input.blocks !== undefined ? { blocks: input.blocks } : {}),
      },
    });
    return this.toDto(updated);
  }

  async remove(id: string): Promise<{ success: true }> {
    await this.findById(id);
    await this.prisma.emailTemplate.delete({ where: { id } });
    return { success: true };
  }

  async renderPreview(id: string): Promise<{ html: string }> {
    const template = await this.findById(id);
    return { html: await renderEmailTemplateToHtml(template.blocks) };
  }

  async renderBlocksPreview(blocks: EmailBlock[]): Promise<{ html: string }> {
    return { html: await renderEmailTemplateToHtml(blocks) };
  }

  private toDto(row: EmailTemplate): EmailTemplateDto {
    return {
      id: row.id,
      name: row.name,
      subject: row.subject,
      blocks: row.blocks as unknown as EmailBlock[],
      thumbnailUrl: row.thumbnailUrl,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { CreateMktTagInput, UpdateMktTagInput, MktTagDto } from "@taga-crm/shared";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

@Injectable()
export class MktTagsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<MktTagDto[]> {
    const rows = await this.prisma.mktTag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { contactTags: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      color: r.color,
      createdAt: r.createdAt.toISOString(),
      contactCount: r._count.contactTags,
    }));
  }

  async create(input: CreateMktTagInput): Promise<MktTagDto> {
    const slug = slugify(input.name);
    const existing = await this.prisma.mktTag.findFirst({ where: { OR: [{ name: input.name }, { slug }] } });
    if (existing) throw new ConflictException("Tag đã tồn tại");

    const r = await this.prisma.mktTag.create({
      data: { name: input.name, slug, color: input.color ?? "#8b5cf6" },
      include: { _count: { select: { contactTags: true } } },
    });
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      color: r.color,
      createdAt: r.createdAt.toISOString(),
      contactCount: r._count.contactTags,
    };
  }

  async update(id: string, input: UpdateMktTagInput): Promise<MktTagDto> {
    const existing = await this.prisma.mktTag.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Không tìm thấy tag");

    const updateData: Record<string, unknown> = {};
    if (input.name) {
      updateData.name = input.name;
      updateData.slug = slugify(input.name);
    }
    if (input.color) updateData.color = input.color;

    const r = await this.prisma.mktTag.update({
      where: { id },
      data: updateData,
      include: { _count: { select: { contactTags: true } } },
    });
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      color: r.color,
      createdAt: r.createdAt.toISOString(),
      contactCount: r._count.contactTags,
    };
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.mktTag.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Không tìm thấy tag");
    await this.prisma.mktTag.delete({ where: { id } });
  }
}

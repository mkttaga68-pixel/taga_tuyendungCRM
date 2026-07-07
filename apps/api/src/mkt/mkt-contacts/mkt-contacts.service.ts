import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  CreateMktContactInput,
  UpdateMktContactInput,
  MktContactDto,
  MktContactQuery,
  MktContactListResponse,
  MktContactEventDto,
} from "@taga-crm/shared";

function toDto(
  r: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    source: string | null;
    notes: string | null;
    unsubscribed: boolean;
    candidateId: string | null;
    createdAt: Date;
    updatedAt: Date;
    tags: { tag: { id: string; name: string; color: string } }[];
    listMembers: { list: { id: string; name: string; color: string } }[];
  }
): MktContactDto {
  return {
    id: r.id,
    fullName: r.fullName,
    email: r.email,
    phone: r.phone,
    source: r.source,
    notes: r.notes,
    unsubscribed: r.unsubscribed,
    candidateId: r.candidateId,
    tags: r.tags.map((t) => t.tag),
    lists: r.listMembers.map((m) => m.list),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

@Injectable()
export class MktContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: MktContactQuery): Promise<MktContactListResponse> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(200, Math.max(1, query.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
        { phone: { contains: query.search, mode: "insensitive" } },
      ];
    }
    if (query.listId) {
      where.listMembers = { some: { listId: query.listId } };
    }
    if (query.tagId) {
      where.tags = { some: { tagId: query.tagId } };
    }
    if (query.unsubscribed !== undefined) {
      where.unsubscribed = query.unsubscribed;
    }

    const include = {
      tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
      listMembers: { include: { list: { select: { id: true, name: true, color: true } } } },
    };

    const [rows, total] = await Promise.all([
      this.prisma.mktContact.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, include }),
      this.prisma.mktContact.count({ where }),
    ]);

    return { data: rows.map(toDto), total, page, limit };
  }

  async findOne(id: string): Promise<MktContactDto> {
    const r = await this.prisma.mktContact.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
        listMembers: { include: { list: { select: { id: true, name: true, color: true } } } },
      },
    });
    if (!r || r.deletedAt) throw new NotFoundException("Không tìm thấy contact");
    return toDto(r);
  }

  async create(input: CreateMktContactInput): Promise<MktContactDto> {
    const existing = await this.prisma.mktContact.findFirst({
      where: { email: input.email, deletedAt: null },
    });
    if (existing) throw new ConflictException("Email đã tồn tại trong danh bạ Marketing");

    const { tagIds = [], listIds = [], ...data } = input;
    const r = await this.prisma.mktContact.create({
      data: {
        ...data,
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
        listMembers: { create: listIds.map((listId) => ({ listId })) },
      },
      include: {
        tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
        listMembers: { include: { list: { select: { id: true, name: true, color: true } } } },
      },
    });

    await this.prisma.mktContactEvent.create({
      data: { contactId: r.id, eventType: "CONTACT_CREATED", meta: {} },
    });

    return toDto(r);
  }

  async update(id: string, input: UpdateMktContactInput): Promise<MktContactDto> {
    await this.findOne(id);
    const { tagIds, listIds, ...data } = input;

    await this.prisma.mktContact.update({ where: { id }, data });

    if (tagIds !== undefined) {
      await this.prisma.mktContactTag.deleteMany({ where: { contactId: id } });
      if (tagIds.length > 0) {
        await this.prisma.mktContactTag.createMany({
          data: tagIds.map((tagId) => ({ contactId: id, tagId })),
          skipDuplicates: true,
        });
      }
    }
    if (listIds !== undefined) {
      await this.prisma.mktContactListMember.deleteMany({ where: { contactId: id } });
      if (listIds.length > 0) {
        await this.prisma.mktContactListMember.createMany({
          data: listIds.map((listId) => ({ contactId: id, listId })),
          skipDuplicates: true,
        });
      }
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.mktContact.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async getTimeline(id: string): Promise<MktContactEventDto[]> {
    await this.findOne(id);
    const events = await this.prisma.mktContactEvent.findMany({
      where: { contactId: id },
      orderBy: { occurredAt: "desc" },
      take: 100,
    });
    return events.map((e) => ({
      id: e.id,
      contactId: e.contactId,
      eventType: e.eventType,
      meta: e.meta as Record<string, unknown>,
      occurredAt: e.occurredAt.toISOString(),
    }));
  }
}

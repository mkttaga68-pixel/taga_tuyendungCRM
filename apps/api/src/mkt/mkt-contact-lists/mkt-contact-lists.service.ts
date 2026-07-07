import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  CreateMktContactListInput,
  UpdateMktContactListInput,
  MktContactListDto,
} from "@taga-crm/shared";
import type { AccessTokenPayload } from "@taga-crm/shared";

@Injectable()
export class MktContactListsService {
  constructor(private readonly prisma: PrismaService) {}

  private async toDto(r: {
    id: string;
    name: string;
    description: string | null;
    color: string;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
    _count?: { members: number };
  }): Promise<MktContactListDto> {
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      color: r.color,
      createdBy: r.createdBy,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      memberCount: r._count?.members ?? 0,
    };
  }

  async list(): Promise<MktContactListDto[]> {
    const rows = await this.prisma.mktContactList.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { members: true } } },
    });
    return Promise.all(rows.map((r) => this.toDto(r)));
  }

  async findOne(id: string): Promise<MktContactListDto> {
    const r = await this.prisma.mktContactList.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });
    if (!r || r.deletedAt) throw new NotFoundException("Không tìm thấy danh bạ");
    return this.toDto(r);
  }

  async create(input: CreateMktContactListInput, user: AccessTokenPayload): Promise<MktContactListDto> {
    const r = await this.prisma.mktContactList.create({
      data: { ...input, createdBy: user.sub },
      include: { _count: { select: { members: true } } },
    });
    return this.toDto(r);
  }

  async update(id: string, input: UpdateMktContactListInput): Promise<MktContactListDto> {
    await this.findOne(id);
    const r = await this.prisma.mktContactList.update({
      where: { id },
      data: input,
      include: { _count: { select: { members: true } } },
    });
    return this.toDto(r);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.mktContactList.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async addContact(listId: string, contactId: string): Promise<void> {
    await this.findOne(listId);
    const contact = await this.prisma.mktContact.findUnique({ where: { id: contactId } });
    if (!contact || contact.deletedAt) throw new NotFoundException("Không tìm thấy contact");

    await this.prisma.mktContactListMember.upsert({
      where: { contactId_listId: { contactId, listId } },
      create: { contactId, listId },
      update: {},
    });

    await this.prisma.mktContactEvent.create({
      data: { contactId, eventType: "LIST_JOINED", meta: { listId } },
    });
  }

  async removeContact(listId: string, contactId: string): Promise<void> {
    await this.prisma.mktContactListMember.deleteMany({
      where: { listId, contactId },
    });
  }
}

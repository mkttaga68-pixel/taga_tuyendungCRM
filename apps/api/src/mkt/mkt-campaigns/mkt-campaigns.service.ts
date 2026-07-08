import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  CreateMktCampaignInput,
  UpdateMktCampaignInput,
  MktCampaignDto,
  MktCampaignEmailDto,
  CreateMktCampaignEmailInput,
  UpdateMktCampaignEmailInput,
  MktCampaignEnrollmentDto,
  EnrollContactInput,
  MktSendWindow,
  MktCampaignStatus,
  MktDelayUnit,
} from "@taga-crm/shared";
import type { AccessTokenPayload } from "@taga-crm/shared";

type CampaignRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  opportunitySteps: unknown;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { emails: number; enrollments: number };
};

function campaignToDto(r: CampaignRow): MktCampaignDto {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    status: r.status as MktCampaignStatus,
    fromName: r.fromName,
    fromEmail: r.fromEmail,
    replyTo: r.replyTo,
    opportunitySteps: Array.isArray(r.opportunitySteps) ? (r.opportunitySteps as string[]) : [],
    createdBy: r.createdBy,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    emailCount: r._count.emails,
    enrollmentCount: r._count.enrollments,
  };
}

type CampaignEmailRow = {
  id: string;
  campaignId: string;
  position: number;
  subject: string;
  bodyHtml: string;
  templateId: string | null;
  delayValue: number;
  delayUnit: string;
  sendWindow: unknown;
  condition: unknown;
  createdAt: Date;
  updatedAt: Date;
};

async function emailToDto(
  r: CampaignEmailRow,
  prisma: PrismaService,
): Promise<MktCampaignEmailDto> {
  const [sent, opened, clicked, bounced, spam, unsubscribed] = await Promise.all([
    prisma.mktEmailSend.count({ where: { campaignEmailId: r.id, status: "SENT" } }),
    prisma.mktEmailEvent.count({ where: { send: { campaignEmailId: r.id }, eventType: "OPEN" } }),
    prisma.mktEmailEvent.count({ where: { send: { campaignEmailId: r.id }, eventType: "CLICK" } }),
    prisma.mktEmailEvent.count({ where: { send: { campaignEmailId: r.id }, eventType: "BOUNCE" } }),
    prisma.mktEmailEvent.count({ where: { send: { campaignEmailId: r.id }, eventType: "SPAM" } }),
    prisma.mktEmailEvent.count({ where: { send: { campaignEmailId: r.id }, eventType: "UNSUBSCRIBE" } }),
  ]);

  return {
    id: r.id,
    campaignId: r.campaignId,
    position: r.position,
    subject: r.subject,
    bodyHtml: r.bodyHtml,
    templateId: r.templateId,
    delayValue: r.delayValue,
    delayUnit: r.delayUnit as MktDelayUnit,
    sendWindow: r.sendWindow as MktSendWindow,
    condition: r.condition as Record<string, unknown>,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    stats: {
      sent,
      delivered: sent,
      opened,
      openRate: sent > 0 ? Math.round((opened / sent) * 10000) / 100 : 0,
      clicked,
      ctr: sent > 0 ? Math.round((clicked / sent) * 10000) / 100 : 0,
      bounced,
      spam,
      unsubscribed,
    },
  };
}

const campaignInclude = { _count: { select: { emails: true, enrollments: true } } };

@Injectable()
export class MktCampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<MktCampaignDto[]> {
    const rows = await this.prisma.mktCampaign.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: campaignInclude,
    });
    return rows.map(campaignToDto);
  }

  async findOne(id: string): Promise<MktCampaignDto> {
    const r = await this.prisma.mktCampaign.findUnique({ where: { id }, include: campaignInclude });
    if (!r || r.deletedAt) throw new NotFoundException("Không tìm thấy campaign");
    return campaignToDto(r);
  }

  async create(input: CreateMktCampaignInput, user: AccessTokenPayload): Promise<MktCampaignDto> {
    const r = await this.prisma.mktCampaign.create({
      data: { ...input, createdBy: user.sub },
      include: campaignInclude,
    });
    return campaignToDto(r);
  }

  async update(id: string, input: UpdateMktCampaignInput): Promise<MktCampaignDto> {
    await this.findOne(id);
    const r = await this.prisma.mktCampaign.update({
      where: { id },
      data: input,
      include: campaignInclude,
    });
    return campaignToDto(r);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.mktCampaign.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async activate(id: string): Promise<MktCampaignDto> {
    const campaign = await this.findOne(id);
    if (campaign.emailCount === 0) {
      throw new BadRequestException("Campaign cần ít nhất 1 email trước khi kích hoạt");
    }
    const r = await this.prisma.mktCampaign.update({
      where: { id },
      data: { status: "ACTIVE" },
      include: campaignInclude,
    });
    return campaignToDto(r);
  }

  async pause(id: string): Promise<MktCampaignDto> {
    await this.findOne(id);
    const r = await this.prisma.mktCampaign.update({
      where: { id },
      data: { status: "PAUSED" },
      include: campaignInclude,
    });
    return campaignToDto(r);
  }

  // ---- Campaign Emails (Sequence Steps) ----

  async listEmails(campaignId: string): Promise<MktCampaignEmailDto[]> {
    await this.findOne(campaignId);
    const rows = await this.prisma.mktCampaignEmail.findMany({
      where: { campaignId },
      orderBy: { position: "asc" },
    });
    return Promise.all(rows.map((r) => emailToDto(r, this.prisma)));
  }

  async addEmail(campaignId: string, input: CreateMktCampaignEmailInput): Promise<MktCampaignEmailDto> {
    await this.findOne(campaignId);
    const last = await this.prisma.mktCampaignEmail.findFirst({
      where: { campaignId },
      orderBy: { position: "desc" },
    });
    const position = (last?.position ?? 0) + 1;

    const r = await this.prisma.mktCampaignEmail.create({
      data: {
        campaignId,
        position,
        subject: input.subject,
        bodyHtml: input.bodyHtml,
        templateId: input.templateId ?? null,
        delayValue: input.delayValue ?? 0,
        delayUnit: (input.delayUnit ?? "DAYS") as "MINUTES" | "HOURS" | "DAYS" | "WEEKS",
        sendWindow: input.sendWindow ?? {
          from: "08:00",
          to: "20:00",
          days: [1, 2, 3, 4, 5],
          tz: "Asia/Ho_Chi_Minh",
        },
        condition: (input.condition ?? {}) as Record<string, string>,
      },
    });
    return emailToDto(r, this.prisma);
  }

  async updateEmail(
    campaignId: string,
    emailId: string,
    input: UpdateMktCampaignEmailInput,
  ): Promise<MktCampaignEmailDto> {
    const row = await this.prisma.mktCampaignEmail.findFirst({ where: { id: emailId, campaignId } });
    if (!row) throw new NotFoundException("Không tìm thấy email trong sequence");

    const updateData: Record<string, unknown> = {};
    if (input.subject !== undefined) updateData.subject = input.subject;
    if (input.bodyHtml !== undefined) updateData.bodyHtml = input.bodyHtml;
    if (input.templateId !== undefined) updateData.templateId = input.templateId;
    if (input.delayValue !== undefined) updateData.delayValue = input.delayValue;
    if (input.delayUnit !== undefined) updateData.delayUnit = input.delayUnit;
    if (input.sendWindow !== undefined) updateData.sendWindow = input.sendWindow;
    if (input.condition !== undefined) updateData.condition = input.condition;

    const r = await this.prisma.mktCampaignEmail.update({ where: { id: emailId }, data: updateData });
    return emailToDto(r, this.prisma);
  }

  async removeEmail(campaignId: string, emailId: string): Promise<void> {
    const row = await this.prisma.mktCampaignEmail.findFirst({ where: { id: emailId, campaignId } });
    if (!row) throw new NotFoundException("Không tìm thấy email trong sequence");

    await this.prisma.mktCampaignEmail.delete({ where: { id: emailId } });

    // Re-number remaining emails
    const remaining = await this.prisma.mktCampaignEmail.findMany({
      where: { campaignId },
      orderBy: { position: "asc" },
    });
    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i];
      if (!item) continue;
      await this.prisma.mktCampaignEmail.update({
        where: { id: item.id },
        data: { position: i + 1 },
      });
    }
  }

  async reorderEmail(campaignId: string, emailId: string, newPosition: number): Promise<MktCampaignEmailDto[]> {
    const row = await this.prisma.mktCampaignEmail.findFirst({ where: { id: emailId, campaignId } });
    if (!row) throw new NotFoundException("Không tìm thấy email trong sequence");

    const all = await this.prisma.mktCampaignEmail.findMany({
      where: { campaignId },
      orderBy: { position: "asc" },
    });
    const filtered = all.filter((e) => e.id !== emailId);
    const clamped = Math.max(1, Math.min(newPosition, filtered.length + 1));
    filtered.splice(clamped - 1, 0, row);

    await Promise.all(
      filtered.map((e, idx) =>
        this.prisma.mktCampaignEmail.update({ where: { id: e.id }, data: { position: idx + 1 } }),
      ),
    );

    return this.listEmails(campaignId);
  }

  // ---- Enrollments ----

  async listEnrollments(campaignId: string): Promise<MktCampaignEnrollmentDto[]> {
    await this.findOne(campaignId);
    const rows = await this.prisma.mktCampaignEnrollment.findMany({
      where: { campaignId },
      orderBy: { enrolledAt: "desc" },
      include: { contact: { select: { fullName: true, email: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      contactId: r.contactId,
      contactName: r.contact.fullName,
      contactEmail: r.contact.email,
      campaignId: r.campaignId,
      currentStep: r.currentStep,
      status: r.status as MktCampaignEnrollmentDto["status"],
      enrolledAt: r.enrolledAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
    }));
  }

  async enrollContacts(campaignId: string, input: EnrollContactInput): Promise<{ enrolled: number }> {
    const campaign = await this.findOne(campaignId);
    if (campaign.status !== "ACTIVE") {
      throw new BadRequestException("Campaign phải ở trạng thái ACTIVE mới có thể enroll");
    }

    let enrolled = 0;
    for (const contactId of input.contactIds) {
      const contact = await this.prisma.mktContact.findUnique({ where: { id: contactId } });
      if (!contact || contact.deletedAt || contact.unsubscribed) continue;

      const existing = await this.prisma.mktCampaignEnrollment.findUnique({
        where: { contactId_campaignId: { contactId, campaignId } },
      });
      if (existing) continue;

      await this.prisma.mktCampaignEnrollment.create({
        data: { contactId, campaignId, currentStep: 0, status: "ACTIVE" },
      });
      await this.prisma.mktContactEvent.create({
        data: { contactId, eventType: "CAMPAIGN_ENROLLED", meta: { campaignId } },
      });
      enrolled++;
    }

    return { enrolled };
  }
}

import { Injectable, NotFoundException } from "@nestjs/common";
import {
  sendEmailSchema,
  type AccessTokenPayload,
  type EmailLogDto,
  type EmailLogListQuery,
  type EmailLogListResponse,
  type SendEmailInput,
} from "@taga-crm/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ResendService } from "../email-settings/resend.service";
import { EmailSettingsService } from "../email-settings/email-settings.service";

function plainBodyToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const withBreaks = withBold.replace(/\n/g, "<br>");
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:400;line-height:1.7;color:#222;background:#fff;margin:0;padding:0;">
<div style="max-width:600px;margin:0 auto;padding:24px;">${withBreaks}</div>
</body></html>`;
}

@Injectable()
export class EmailLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resendService: ResendService,
    private readonly emailSettingsService: EmailSettingsService,
  ) {}

  async list(query: EmailLogListQuery): Promise<EmailLogListResponse> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.direction) where.direction = query.direction;
    if (query.status) where.status = query.status;
    if (query.candidateId) where.candidateId = query.candidateId;
    if (query.search) {
      where.OR = [
        { subject: { contains: query.search, mode: "insensitive" } },
        { toEmail: { contains: query.search, mode: "insensitive" } },
        { fromEmail: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          candidate: { select: { fullName: true } },
          sender: { select: { fullName: true } },
        },
      }),
      this.prisma.emailLog.count({ where }),
    ]);

    return {
      data: rows.map((r) => ({
        id: r.id,
        templateId: r.templateId,
        toEmail: r.toEmail,
        fromEmail: r.fromEmail,
        candidateId: r.candidateId,
        candidateName: r.candidate?.fullName ?? null,
        subject: r.subject,
        bodyHtml: r.bodyHtml,
        status: r.status as EmailLogDto["status"],
        direction: r.direction as EmailLogDto["direction"],
        providerMessageId: r.providerMessageId,
        sentAt: r.sentAt?.toISOString() ?? null,
        errorMessage: r.errorMessage,
        sentBy: r.sentBy,
        sentByName: r.sender?.fullName ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  async send(input: SendEmailInput, user: AccessTokenPayload): Promise<EmailLogDto> {
    // Validate again at service layer — ZodPipe already ran but be explicit
    const validated = sendEmailSchema.parse(input);

    const cfg = await this.emailSettingsService.getConfig();
    const fromEmail = cfg
      ? cfg.fromName
        ? `${cfg.fromName} <${cfg.fromEmail}>`
        : cfg.fromEmail
      : null;

    const html = plainBodyToHtml(validated.bodyTemplate);

    let providerMessageId: string | null = null;
    let status: "SENT" | "FAILED" = "FAILED";
    let errorMessage: string | null = null;

    try {
      const result = await this.resendService.send({
        to: validated.to,
        subject: validated.subject,
        html,
      });
      providerMessageId = result.id;
      status = "SENT";
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }

    const log = await this.prisma.emailLog.create({
      data: {
        templateId: validated.templateId ?? null,
        toEmail: validated.to,
        fromEmail: fromEmail,
        candidateId: validated.candidateId ?? null,
        subject: validated.subject,
        bodyHtml: html,
        status,
        direction: "OUTBOUND",
        providerMessageId,
        sentAt: status === "SENT" ? new Date() : null,
        errorMessage,
        sentBy: user.sub,
      },
      include: {
        candidate: { select: { fullName: true } },
        sender: { select: { fullName: true } },
      },
    });

    if (status === "FAILED") {
      throw new Error(errorMessage ?? "Không thể gửi email");
    }

    return {
      id: log.id,
      templateId: log.templateId,
      toEmail: log.toEmail,
      fromEmail: log.fromEmail,
      candidateId: log.candidateId,
      candidateName: log.candidate?.fullName ?? null,
      subject: log.subject,
      bodyHtml: log.bodyHtml,
      status: log.status as EmailLogDto["status"],
      direction: log.direction as EmailLogDto["direction"],
      providerMessageId: log.providerMessageId,
      sentAt: log.sentAt?.toISOString() ?? null,
      errorMessage: log.errorMessage,
      sentBy: log.sentBy,
      sentByName: log.sender?.fullName ?? null,
      createdAt: log.createdAt.toISOString(),
    };
  }

  /** Nhận email inbound từ Resend webhook — lưu vào EmailLog với direction=INBOUND. */
  async receiveInbound(payload: unknown): Promise<{ received: true }> {
    const data = payload as {
      type?: string;
      data?: {
        from?: string;
        to?: string[];
        subject?: string;
        html?: string;
        text?: string;
        message_id?: string;
      };
    };

    if (data?.type !== "email.inbound" || !data.data) {
      return { received: true };
    }

    const inbound = data.data;
    const fromEmail = inbound.from ?? "unknown";
    const toEmail = Array.isArray(inbound.to) ? (inbound.to[0] ?? "") : "";
    const subject = inbound.subject ?? "(không có tiêu đề)";
    const bodyHtml = inbound.html ?? `<pre>${inbound.text ?? ""}</pre>`;

    // Thử match candidate theo fromEmail
    const candidate = await this.prisma.candidate.findFirst({
      where: { email: fromEmail, deletedAt: null },
      select: { id: true },
    });

    await this.prisma.emailLog.create({
      data: {
        toEmail,
        fromEmail,
        candidateId: candidate?.id ?? null,
        subject,
        bodyHtml,
        status: "SENT",
        direction: "INBOUND",
        providerMessageId: inbound.message_id ?? null,
        sentAt: new Date(),
      },
    });

    return { received: true };
  }

  async findOne(id: string): Promise<EmailLogDto> {
    const log = await this.prisma.emailLog.findUnique({
      where: { id },
      include: {
        candidate: { select: { fullName: true } },
        sender: { select: { fullName: true } },
      },
    });
    if (!log) throw new NotFoundException("Không tìm thấy email log");

    return {
      id: log.id,
      templateId: log.templateId,
      toEmail: log.toEmail,
      fromEmail: log.fromEmail,
      candidateId: log.candidateId,
      candidateName: log.candidate?.fullName ?? null,
      subject: log.subject,
      bodyHtml: log.bodyHtml,
      status: log.status as EmailLogDto["status"],
      direction: log.direction as EmailLogDto["direction"],
      providerMessageId: log.providerMessageId,
      sentAt: log.sentAt?.toISOString() ?? null,
      errorMessage: log.errorMessage,
      sentBy: log.sentBy,
      sentByName: log.sender?.fullName ?? null,
      createdAt: log.createdAt.toISOString(),
    };
  }
}

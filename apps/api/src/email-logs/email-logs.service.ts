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

function formatDateVN(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

function resolveVariables(
  template: string,
  candidateCtx: Record<string, string | null> | null,
): string {
  let result = template.replace(/\{\{today\}\}/g, formatDateVN(new Date()));
  if (candidateCtx) {
    result = result.replace(/\{\{candidate\.(\w+)\}\}/g, (_, key: string) => {
      const val = candidateCtx[key];
      return val ?? `{{candidate.${key}}}`;
    });
  }
  return result;
}

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

    const inboxWhere = { direction: "INBOUND", isRead: false };
    const [rows, total, unreadCount] = await Promise.all([
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
      this.prisma.emailLog.count({ where: inboxWhere }),
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
        isRead: r.isRead,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      unreadCount,
    };
  }

  async markAsRead(id: string): Promise<void> {
    await this.prisma.emailLog.update({
      where: { id },
      data: { isRead: true },
    });
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

    let candidateCtx: Record<string, string | null> | null = null;
    if (validated.candidateId) {
      const c = await this.prisma.candidate.findUnique({
        where: { id: validated.candidateId },
        include: { status: true, recruiter: true, landingPage: true },
      });
      if (c) {
        candidateCtx = {
          fullName: c.fullName,
          email: c.email ?? null,
          phone: c.phone ?? null,
          statusLabel: c.status.label,
          nextActionNote: c.nextActionNote ?? null,
          recruiterName: (c.recruiter as { fullName?: string } | null)?.fullName ?? null,
          landingPageName: (c.landingPage as { name?: string } | null)?.name ?? null,
        };
      }
    }

    const resolvedBody = resolveVariables(validated.bodyTemplate, candidateCtx);
    const resolvedSubject = resolveVariables(validated.subject, candidateCtx);
    const html = plainBodyToHtml(resolvedBody);

    let providerMessageId: string | null = null;
    let status: "SENT" | "FAILED" = "FAILED";
    let errorMessage: string | null = null;

    try {
      const result = await this.resendService.send({
        to: validated.to,
        subject: resolvedSubject,
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
        subject: resolvedSubject,
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
    // Log toàn bộ payload để debug cấu trúc Resend gửi về
    console.log("[inbound] raw payload keys:", Object.keys(payload as object));
    console.log("[inbound] full payload:", JSON.stringify(payload, null, 2).slice(0, 3000));

    const data = payload as {
      type?: string;
      data?: Record<string, unknown>;
    };

    if ((data?.type !== "email.inbound" && data?.type !== "email.received") || !data.data) {
      console.log("[inbound] skipped — type:", data?.type, "has data:", !!data?.data);
      return { received: true };
    }

    const inbound = data.data;
    console.log("[inbound] data keys:", Object.keys(inbound));

    const fromEmail = (inbound.from as string | undefined) ?? "unknown";
    const toRaw = inbound.to;
    const toEmail = Array.isArray(toRaw) ? ((toRaw[0] as string) ?? "") : ((toRaw as string | undefined) ?? "");
    const subject = (inbound.subject as string | undefined) ?? "(không có tiêu đề)";

    // Log từng field để debug — ?? không lọc được chuỗi rỗng
    console.log("[inbound] html:", JSON.stringify(inbound.html)?.slice(0, 200));
    console.log("[inbound] text:", JSON.stringify(inbound.text)?.slice(0, 200));
    console.log("[inbound] all keys+types:", Object.entries(inbound).map(([k, v]) => `${k}:${typeof v}(${typeof v === "string" ? v.length : "-"})`).join(", "));

    // Dùng || thay vì ?? để bỏ qua cả chuỗi rỗng ""
    const nonEmpty = (v: unknown): string | undefined =>
      typeof v === "string" && v.trim().length > 0 ? v : undefined;

    const htmlRaw =
      nonEmpty(inbound.html) ??
      nonEmpty(inbound.htmlBody) ??
      nonEmpty(inbound.body_html) ??
      nonEmpty(inbound.body);

    const textRaw =
      nonEmpty(inbound.text) ??
      nonEmpty(inbound.textBody) ??
      nonEmpty(inbound.body_text) ??
      nonEmpty(inbound.plain);

    const messageId =
      (inbound.message_id as string | undefined) ??
      (inbound.messageId as string | undefined) ??
      (inbound.email_id as string | undefined);

    console.log("[inbound] htmlRaw length:", htmlRaw?.length ?? 0, "textRaw length:", textRaw?.length ?? 0);

    const bodyHtml = htmlRaw
      ? htmlRaw
      : textRaw
        ? `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;padding:24px;"><pre style="white-space:pre-wrap;word-break:break-word;">${textRaw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></body></html>`
        : `<p style="color:#888;font-style:italic;">(Không có nội dung)</p>`;

    // Thử match candidate theo fromEmail (strip display name nếu có "Name <email>")
    const emailMatch = fromEmail.match(/<([^>]+)>/);
    const normalizedFrom = emailMatch ? emailMatch[1] : fromEmail;

    const candidate = await this.prisma.candidate.findFirst({
      where: { email: normalizedFrom, deletedAt: null },
      select: { id: true },
    });

    await this.prisma.emailLog.create({
      data: {
        toEmail,
        fromEmail: normalizedFrom,
        candidateId: candidate?.id ?? null,
        subject,
        bodyHtml,
        status: "SENT",
        direction: "INBOUND",
        providerMessageId: messageId ?? null,
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
      isRead: log.isRead,
      createdAt: log.createdAt.toISOString(),
    };
  }
}

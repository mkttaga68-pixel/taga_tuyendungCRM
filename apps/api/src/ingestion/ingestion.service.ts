import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { publicSubmitPayloadSchema, type FormSchemaShape } from "@taga-crm/shared";
import { PrismaService } from "../prisma/prisma.service";
import { LandingPagesService } from "../landing-pages/landing-pages.service";
import { LandingPageFormsService } from "../landing-pages/landing-page-forms.service";
import { CandidateMatchingService } from "../candidates/candidate-matching.service";
import { FacebookCapiService } from "./facebook-capi.service";
import { sha256Hex } from "../common/utils/hash.util";
import { parseUtmFromPageUrl } from "../candidates/candidate-matching.util";
import { parseUserAgent } from "./ingestion.util";

const TOP_LEVEL_PAYLOAD_KEYS = [
  "cvFileName",
  "cvBase64",
  "fbc",
  "fbp",
  "ttclid",
  "userAgent",
  "pageUrl",
] as const;

const DEFAULT_HONEYPOT_KEY = "honeypot";

export interface IngestionRequestMeta {
  ip: string | null;
  userAgentHeader: string | null;
  refererHeader: string | null;
}

export type IngestionOutcome =
  | { kind: "not_found" }
  | { kind: "unauthorized" }
  | { kind: "invalid"; message: string }
  | { kind: "honeypot" }
  | { kind: "accepted" };

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly landingPagesService: LandingPagesService,
    private readonly formsService: LandingPageFormsService,
    private readonly candidateMatchingService: CandidateMatchingService,
    private readonly facebookCapiService: FacebookCapiService,
  ) {}

  async handleSubmit(
    slug: string,
    apiKey: string | undefined,
    rawBody: Record<string, unknown>,
    meta: IngestionRequestMeta,
  ): Promise<IngestionOutcome> {
    const landingPage = await this.landingPagesService.findActiveBySlugRaw(slug);
    if (!landingPage || landingPage.status !== "ACTIVE") {
      return { kind: "not_found" };
    }

    if (!apiKey || sha256Hex(apiKey) !== landingPage.apiKeyHash) {
      return { kind: "unauthorized" };
    }

    const activeForm = await this.formsService.getActiveRaw(landingPage.id);
    const formSchema = activeForm ? (activeForm.schema as unknown as FormSchemaShape) : null;
    const honeypotKey = formSchema?.honeypotKey || DEFAULT_HONEYPOT_KEY;

    const parsed = publicSubmitPayloadSchema.safeParse(
      this.normalizeIncomingBody(rawBody, honeypotKey),
    );
    if (!parsed.success) {
      return {
        kind: "invalid",
        message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
      };
    }
    const payload = parsed.data;

    if (payload.honeypot && payload.honeypot.trim() !== "") {
      this.logger.warn(`Honeypot bị kích hoạt cho landing page "${slug}" — bỏ qua, không lưu`);
      return { kind: "honeypot" };
    }

    const ua = parseUserAgent(payload.userAgent || meta.userAgentHeader);
    const utm = parseUtmFromPageUrl(payload.pageUrl);

    const submission = await this.prisma.formSubmission.create({
      data: {
        landingPageId: landingPage.id,
        formId: activeForm?.id ?? null,
        rawPayload: payload as unknown as Prisma.InputJsonValue,
        ip: meta.ip,
        userAgent: payload.userAgent || meta.userAgentHeader || null,
        device: ua.device,
        os: ua.os,
        browser: ua.browser,
        referrer: meta.refererHeader,
        utmSource: utm.utmSource,
        utmMedium: utm.utmMedium,
        utmCampaign: utm.utmCampaign,
        utmContent: utm.utmContent,
        utmTerm: utm.utmTerm,
        fbc: payload.fbc || null,
        fbp: payload.fbp || null,
        ttclid: payload.ttclid || utm.ttclid || null,
        processingStatus: "PENDING",
      },
    });

    const result = await this.candidateMatchingService.processSubmission(
      submission,
      landingPage,
      formSchema,
    );

    if (result.candidateId && (result.status === "PROCESSED" || result.status === "DUPLICATE")) {
      const candidate = await this.prisma.candidate.findUnique({
        where: { id: result.candidateId },
        select: { email: true, phone: true },
      });
      await this.facebookCapiService.sendLeadEvent({
        email: candidate?.email ?? null,
        phone: candidate?.phone ?? null,
        fbc: payload.fbc,
        fbp: payload.fbp,
        userAgent: payload.userAgent,
        pageUrl: payload.pageUrl,
      });

      if (result.status === "PROCESSED") {
        this.fireLarkWebhook(payload.values as Record<string, unknown>, payload.pageUrl);
      }
    }

    return { kind: "accepted" };
  }

  private fireLarkWebhook(values: Record<string, unknown>, pageUrl?: string | null): void {
    const url = process.env.LARK_WEBHOOK_URL;
    if (!url) return;
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, pageUrl: pageUrl ?? "" }),
    }).catch((err: Error) => this.logger.warn(`Lark webhook error: ${err.message}`));
  }

  /**
   * honeypotKey do Form Builder cấu hình (vd "website") — tên field thật trên
   * HTML, đặt tên "vô hại" để bot tự động điền vào, khác với key cố định nội
   * bộ "honeypot" mà publicSubmitPayloadSchema kiểm tra. Áp dụng đồng nhất
   * cho cả request JSON (đã có "values") và urlencoded phẳng (chưa có).
   */
  private normalizeIncomingBody(body: Record<string, unknown>, honeypotKey: string): unknown {
    const honeypotValue = body[honeypotKey];

    // Chuẩn: { values: { ... }, fbc, fbp, ... }
    if (body.values && typeof body.values === "object" && !Array.isArray(body.values)) {
      return { ...body, honeypot: honeypotValue };
    }

    // Ladipage format 1: { data: { "Họ và tên": "...", ... }, ... }
    if (body.data && typeof body.data === "object" && !Array.isArray(body.data)) {
      const flat = body.data as Record<string, unknown>;
      const values: Record<string, unknown> = {};
      const top: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(flat)) {
        if ((TOP_LEVEL_PAYLOAD_KEYS as readonly string[]).includes(key)) {
          top[key] = value;
        } else {
          values[key] = value;
        }
      }
      return { values, pageUrl: body.page_url ?? body.pageUrl, ...top, honeypot: honeypotValue };
    }

    // Ladipage format 2: { fields: [{ name: "Họ và tên", value: "..." }], ... }
    if (Array.isArray(body.fields)) {
      const values: Record<string, unknown> = {};
      for (const field of body.fields as Array<{ name?: string; label?: string; value?: unknown }>) {
        const key = field.name ?? field.label;
        if (key) values[key] = field.value;
      }
      return { values, pageUrl: body.page_url ?? body.pageUrl, honeypot: honeypotValue };
    }

    // Flat body (urlencoded hoặc JSON phẳng): mọi key không phải top-level → values
    const values: Record<string, unknown> = {};
    const top: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (key === honeypotKey) continue;
      if ((TOP_LEVEL_PAYLOAD_KEYS as readonly string[]).includes(key)) {
        top[key] = value;
      } else {
        values[key] = value;
      }
    }
    return { values, ...top, honeypot: honeypotValue };
  }
}

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { sha256Hex } from "../common/utils/hash.util";
import { normalizeVnPhone } from "../candidates/candidate-matching.util";

export interface FacebookLeadEventInput {
  email?: string | null;
  phone?: string | null;
  fbc?: string | null;
  fbp?: string | null;
  userAgent?: string | null;
  pageUrl?: string | null;
}

/**
 * Gửi sự kiện "Lead" sang Facebook Conversions API server-to-server — thay
 * cho sendFacebookLeadEvent() trong ladipage-tuyendung-taga/google-apps-script.gs.
 * PIXEL_ID/ACCESS_TOKEN nay đọc từ env (FB_PIXEL_ID/FB_ACCESS_TOKEN), không
 * còn hardcode plain-text trong code. Lỗi ở đây KHÔNG được throw ra ngoài —
 * luôn gọi sau khi candidate/form_submission đã lưu thành công, và CAPI là
 * tín hiệu phụ cho quảng cáo, không phải đường lưu dữ liệu chính.
 */
@Injectable()
export class FacebookCapiService {
  private readonly logger = new Logger(FacebookCapiService.name);
  private readonly pixelId?: string;
  private readonly accessToken?: string;
  private hasWarnedMissingConfig = false;

  constructor(private readonly configService: ConfigService) {
    this.pixelId = this.configService.get<string>("FB_PIXEL_ID") || undefined;
    this.accessToken = this.configService.get<string>("FB_ACCESS_TOKEN") || undefined;
  }

  async sendLeadEvent(input: FacebookLeadEventInput): Promise<void> {
    if (!this.pixelId || !this.accessToken) {
      if (!this.hasWarnedMissingConfig) {
        this.logger.warn(
          "FB_PIXEL_ID/FB_ACCESS_TOKEN chưa được cấu hình — bỏ qua gửi Facebook Conversions API",
        );
        this.hasWarnedMissingConfig = true;
      }
      return;
    }

    try {
      const userData: Record<string, unknown> = {};
      const hashedEmail = input.email ? sha256Hex(input.email.trim().toLowerCase()) : null;
      const hashedPhone = normalizeVnPhone(input.phone)
        ? sha256Hex(toInternationalVnPhone(normalizeVnPhone(input.phone)!))
        : null;
      if (hashedEmail) userData.em = [hashedEmail];
      if (hashedPhone) userData.ph = [hashedPhone];
      if (input.fbc) userData.fbc = input.fbc;
      if (input.fbp) userData.fbp = input.fbp;
      if (input.userAgent) userData.client_user_agent = input.userAgent;

      const payload = {
        data: [
          {
            event_name: "Lead",
            event_time: Math.floor(Date.now() / 1000),
            action_source: "website",
            event_source_url: input.pageUrl || "",
            user_data: userData,
          },
        ],
      };

      const url = `https://graph.facebook.com/v19.0/${this.pixelId}/events?access_token=${this.accessToken}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        this.logger.warn(`Facebook CAPI trả về lỗi HTTP ${response.status}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định";
      this.logger.warn(`Gửi Facebook CAPI thất bại: ${message}`);
    }
  }
}

function toInternationalVnPhone(localPhone: string): string {
  return localPhone.startsWith("0") ? `84${localPhone.slice(1)}` : localPhone;
}

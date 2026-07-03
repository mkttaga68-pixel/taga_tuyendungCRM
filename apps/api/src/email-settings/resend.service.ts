import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import * as https from "https";
import { EmailSettingsService } from "./email-settings.service";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

@Injectable()
export class ResendService {
  private readonly logger = new Logger(ResendService.name);

  constructor(private readonly emailSettingsService: EmailSettingsService) {}

  async send(options: SendEmailOptions): Promise<{ id: string }> {
    const cfg = await this.emailSettingsService.getConfig();
    if (!cfg?.apiKey) {
      throw new ServiceUnavailableException("Email chưa được cấu hình. Vào Cài đặt → Kết nối Email.");
    }
    if (!cfg.fromEmail) {
      throw new ServiceUnavailableException("Chưa đặt địa chỉ email gửi đi. Vào Cài đặt → Kết nối Email.");
    }

    const from = cfg.fromName ? `${cfg.fromName} <${cfg.fromEmail}>` : cfg.fromEmail;
    const payload = JSON.stringify({
      from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      ...(options.replyTo ? { reply_to: options.replyTo } : {}),
    });

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: "api.resend.com",
          path: "/emails",
          method: "POST",
          headers: {
            Authorization: `Bearer ${cfg.apiKey}`,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
          },
        },
        (res) => {
          let body = "";
          res.on("data", (c) => (body += c));
          res.on("end", () => {
            try {
              const json = JSON.parse(body);
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve({ id: json.id ?? "ok" });
              } else {
                this.logger.error(`Resend API error ${res.statusCode}: ${body}`);
                reject(
                  new ServiceUnavailableException(
                    json.message ?? json.name ?? `Resend lỗi ${res.statusCode}`,
                  ),
                );
              }
            } catch {
              reject(new ServiceUnavailableException("Resend trả về dữ liệu không hợp lệ"));
            }
          });
        },
      );
      req.on("error", (err) => {
        this.logger.error("Resend network error:", err.message);
        reject(new ServiceUnavailableException("Không thể kết nối đến Resend API"));
      });
      req.write(payload);
      req.end();
    });
  }
}

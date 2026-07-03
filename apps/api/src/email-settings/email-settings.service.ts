import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

const KEY_API_KEY = "resend.apiKey";
const KEY_FROM_EMAIL = "resend.fromEmail";
const KEY_FROM_NAME = "resend.fromName";

@Injectable()
export class EmailSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(): Promise<EmailConfig | null> {
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { in: [KEY_API_KEY, KEY_FROM_EMAIL, KEY_FROM_NAME] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    if (!map[KEY_API_KEY]) return null;
    return {
      apiKey: map[KEY_API_KEY],
      fromEmail: map[KEY_FROM_EMAIL] ?? "",
      fromName: map[KEY_FROM_NAME] ?? "",
    };
  }

  async getStatus(): Promise<{
    configured: boolean;
    maskedKey: string | null;
    fromEmail: string;
    fromName: string;
  }> {
    const cfg = await this.getConfig();
    if (!cfg) return { configured: false, maskedKey: null, fromEmail: "", fromName: "" };
    const k = cfg.apiKey;
    const masked = k.length > 8 ? k.substring(0, 6) + "***" + k.slice(-4) : "***";
    return {
      configured: true,
      maskedKey: masked,
      fromEmail: cfg.fromEmail,
      fromName: cfg.fromName,
    };
  }

  async save(input: { apiKey?: string; fromEmail: string; fromName: string }): Promise<void> {
    const upserts: { key: string; value: string }[] = [
      { key: KEY_FROM_EMAIL, value: input.fromEmail },
      { key: KEY_FROM_NAME, value: input.fromName },
    ];
    if (input.apiKey) {
      upserts.push({ key: KEY_API_KEY, value: input.apiKey });
    }
    for (const { key, value } of upserts) {
      await this.prisma.systemSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
    }
  }
}

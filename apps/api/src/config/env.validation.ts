import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL bắt buộc"),
  REDIS_URL: z.string().min(1, "REDIS_URL bắt buộc"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET tối thiểu 32 ký tự"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET tối thiểu 32 ký tự"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("./storage/uploads"),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
  /**
   * Facebook Conversions API — thay cho token plain-text hardcode trong
   * ladipage-tuyendung-taga/google-apps-script.gs (lỗ hổng đã ghi nhận trong
   * plan gốc). Optional: nếu để trống, IngestionService chỉ log cảnh báo và
   * bỏ qua bước gửi CAPI, không chặn việc lưu form_submission/candidate.
   */
  FB_PIXEL_ID: z.string().optional(),
  FB_ACCESS_TOKEN: z.string().optional(),
  /**
   * Sprint 6 — node EMAIL/SMS trong Automation. Đọc trực tiếp bởi apps/worker
   * (không qua ConfigService của Nest), khai báo ở đây chỉ để tài liệu hoá
   * chung 1 chỗ với các biến môi trường khác. Optional: nếu trống, node sẽ
   * báo lỗi rõ ràng "chưa cấu hình" khi chạy, không giả vờ gửi thành công.
   */
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  /** Google Calendar/Meet OAuth (mỗi user tự connect tài khoản riêng). */
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().optional(),
  /**
   * Sprint 7 — GA4 Data API (rollup KPI hằng ngày, apps/worker). Nguyên văn
   * nội dung file JSON Service Account tải từ Google Cloud Console (role
   * "Viewer" trên GA4 property tương ứng), KHÁC với GOOGLE_OAUTH_CLIENT_ID ở
   * trên (Service Account dùng cho analytics chung property, không phải
   * OAuth theo từng user). Optional: nếu trống, rollup vẫn chạy nhưng
   * visitors/sessions/pageViews/bounceRate/avgTimeSeconds = 0 cho mọi ngày.
   */
  GOOGLE_GA4_SERVICE_ACCOUNT_JSON: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Biến môi trường không hợp lệ:\n${details}`);
  }
  return parsed.data;
}

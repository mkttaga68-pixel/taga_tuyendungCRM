import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import type { Request } from "express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  app.use(helmet());
  app.use(cookieParser());

  const corsOrigin = configService.get<string>("CORS_ORIGIN");
  app.enableCors((req: Request, callback) => {
    // /public/* (Ingestion API) được landing page bên ngoài gọi từ domain bất
    // kỳ (Webcake, domain riêng...) — CORS không phải lớp bảo mật thật cho
    // endpoint này (đã có API key + rate limit + honeypot), chỉ cần mở để
    // browser fetch() đọc được response JSON. Phần còn lại của API vẫn giữ
    // allowlist chặt theo CORS_ORIGIN như cũ.
    const isPublicIngestion = req.url.startsWith("/public/");
    callback(null, {
      origin: isPublicIngestion ? true : corsOrigin,
      credentials: !isPublicIngestion,
      exposedHeaders: ["Content-Disposition", "X-Export-Truncated"],
    });
  });
  app.set("trust proxy", 1);
  // CV nộp qua Landing Page gửi base64 trong JSON/urlencoded body — nâng giới
  // hạn mặc định (100kb) lên đủ cho file vài MB.
  app.useBodyParser("json", { limit: "10mb" });
  app.useBodyParser("urlencoded", { limit: "10mb", extended: true });

  const port = process.env.PORT ?? configService.get<string>("API_PORT") ?? "4000";
  await app.listen(port, "0.0.0.0");
  console.log(`API đang chạy tại http://0.0.0.0:${port}`);
}

void bootstrap();

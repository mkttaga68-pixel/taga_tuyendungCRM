import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import type { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module";

process.on("uncaughtException", (err) => {
  console.error("[CRASH] uncaughtException:", err.stack || err.message);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("[CRASH] unhandledRejection:", reason);
  process.exit(1);
});

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
  // text/plain từ browser fetch() mode:'no-cors' (Webcake/Cake không cho CORS preflight).
  // Đọc raw stream vì useBodyParser("text") không reliable trên một số môi trường deploy.
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const ct = (req.headers["content-type"] ?? "").toLowerCase();
    if (!ct.startsWith("text/plain") || req.body !== undefined) return next();
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      req.body = Buffer.concat(chunks).toString("utf8");
      next();
    });
    req.on("error", (err: Error) => next(err));
  });

  const port = process.env.PORT ?? configService.get<string>("API_PORT") ?? "4000";
  await app.listen(port, "0.0.0.0");
  console.log(`API đang chạy tại http://0.0.0.0:${port}`);

  // Log memory every 5s for the first 2 minutes so we can see RSS before any OOM kill
  let ticks = 0;
  const memTimer = setInterval(() => {
    const m = process.memoryUsage();
    const mb = (n: number) => Math.round(n / 1024 / 1024);
    console.log(
      `[MEM] rss=${mb(m.rss)}MB heap=${mb(m.heapUsed)}/${mb(m.heapTotal)}MB ext=${mb(m.external)}MB`,
    );
    if (++ticks >= 24) clearInterval(memTimer);
  }, 5000);
}

void bootstrap();

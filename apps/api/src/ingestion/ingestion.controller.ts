import { Body, Controller, Param, Post, Query, Req, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { IngestionService, type IngestionRequestMeta } from "./ingestion.service";
import { renderSubmitErrorHtml, renderSubmitSuccessHtml } from "./ingestion.util";

/**
 * Endpoint PUBLIC, không qua JwtAuthGuard — landing page bên ngoài (kể cả
 * nền tảng cloaking như Webcake không cho set custom header) gọi trực tiếp.
 * API key truyền qua query string "?key=" để hoạt động đồng nhất cho cả
 * request JS fetch (JSON) và <form action> thường (urlencoded, không JS).
 * Rate limit riêng, thấp hơn nhiều mức global (120/phút) vì endpoint này
 * không yêu cầu đăng nhập — chống spam/abuse cơ bản, kết hợp honeypot field.
 */
@Controller("public/landing-pages")
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post(":slug/submit")
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  async submit(
    @Param("slug") slug: string,
    @Query("key") key: string | undefined,
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const contentType = (req.headers["content-type"] ?? "").toString();
    const wantsJson = contentType.includes("application/json");
    const meta: IngestionRequestMeta = {
      ip: req.ip ?? null,
      userAgentHeader: req.headers["user-agent"] ?? null,
      refererHeader: req.headers["referer"] ?? null,
    };

    const outcome = await this.ingestionService.handleSubmit(slug, key, body, meta);

    switch (outcome.kind) {
      case "not_found":
        res.status(404);
        return this.respond(res, wantsJson, "not_found", "Không tìm thấy Landing Page");
      case "unauthorized":
        res.status(401);
        return this.respond(res, wantsJson, "unauthorized", "API key không hợp lệ");
      case "invalid":
        res.status(400);
        return this.respond(res, wantsJson, "invalid", outcome.message);
      case "honeypot":
      case "accepted":
        res.status(200);
        return this.respond(res, wantsJson, "success");
    }
  }

  private respond(res: Response, wantsJson: boolean, result: string, message?: string) {
    if (wantsJson) {
      return { result, ...(message ? { error: message } : {}) };
    }
    res.set("Content-Type", "text/html; charset=utf-8");
    return result === "success"
      ? renderSubmitSuccessHtml()
      : renderSubmitErrorHtml(message ?? result);
  }
}

import { Controller, Get, Param, Query, Res, StreamableFile, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { StorageService } from "./storage.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";

/**
 * Tải file đã lưu qua StorageService (CV nộp từ Landing Page...). Yêu cầu
 * đăng nhập vì file có thể chứa PII (CV) — không public như chính file gốc.
 * filename/mimeType là optional, do FE truyền lại từ record (CvAttachment...)
 * để set Content-Disposition/Content-Type đẹp; StorageService không lưu
 * metadata riêng.
 */
@Controller("files")
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly storageService: StorageService) {}

  @Get(":key")
  async download(
    @Param("key") key: string,
    @Query("filename") filename: string | undefined,
    @Query("mimeType") mimeType: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.storageService.readFile(key);
    res.set({
      "Content-Type": mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${(filename || key).replace(/"/g, "")}"`,
    });
    return new StreamableFile(buffer);
  }
}

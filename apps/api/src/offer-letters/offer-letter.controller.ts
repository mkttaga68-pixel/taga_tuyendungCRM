import { Body, Controller, Param, Post, Res, StreamableFile, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import {
  createOfferLetterSchema,
  type AccessTokenPayload,
  type CreateOfferLetterInput,
} from "@taga-crm/shared";
import { OfferLetterService } from "./offer-letter.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("candidates/:candidateId/offer-letter")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "HR_MANAGER", "RECRUITER")
export class OfferLetterController {
  constructor(private readonly offerLetterService: OfferLetterService) {}

  @Post()
  async generate(
    @CurrentUser() user: AccessTokenPayload,
    @Param("candidateId") candidateId: string,
    @Body(new ZodValidationPipe(createOfferLetterSchema)) body: CreateOfferLetterInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { buffer, filename } = await this.offerLetterService.generate(user, candidateId, body);
    // Content-Disposition chỉ nhận ASCII trong tham số "filename" thường — tên
    // ứng viên có dấu tiếng Việt phải mã hoá riêng qua "filename*" (RFC 5987),
    // kèm 1 bản ASCII fallback cho client cũ không hiểu filename*.
    const asciiFallback = filename
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\x20-\x7E]/g, "_");
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    });
    return new StreamableFile(buffer);
  }
}

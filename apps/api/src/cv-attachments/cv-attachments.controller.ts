import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { AccessTokenPayload } from "@taga-crm/shared";
import { CvAttachmentsService } from "./cv-attachments.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@Controller("candidates/:candidateId/cv-attachments")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CvAttachmentsController {
  constructor(private readonly cvAttachmentsService: CvAttachmentsService) {}

  @Get()
  list(@CurrentUser() user: AccessTokenPayload, @Param("candidateId") candidateId: string) {
    return this.cvAttachmentsService.list(user, candidateId);
  }

  @Post()
  @Roles("ADMIN", "HR_MANAGER", "RECRUITER", "INTERVIEWER")
  @UseInterceptors(FileInterceptor("file"))
  upload(
    @CurrentUser() user: AccessTokenPayload,
    @Param("candidateId") candidateId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException("Thiếu file CV");
    }
    return this.cvAttachmentsService.upload(user, candidateId, file);
  }
}

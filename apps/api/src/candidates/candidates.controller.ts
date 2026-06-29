import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import {
  bulkDeleteCandidatesSchema,
  bulkUpdateRecruiterSchema,
  bulkUpdateStatusSchema,
  candidateQueryParamsSchema,
  createCandidateSchema,
  createRecordLinkSchema,
  exportCandidatesQuerySchema,
  updateCandidateFieldsSchema,
  type AccessTokenPayload,
  type BulkDeleteCandidatesInput,
  type BulkUpdateRecruiterInput,
  type BulkUpdateStatusInput,
  type CandidateQueryParams,
  type CreateCandidateInput,
  type CreateRecordLinkInput,
  type ExportCandidatesQuery,
  type UpdateCandidateFieldsInput,
} from "@taga-crm/shared";
import { CandidatesService } from "./candidates.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("candidates")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Get()
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query(new ZodValidationPipe(candidateQueryParamsSchema)) query: CandidateQueryParams,
  ) {
    return this.candidatesService.list(user, query);
  }

  @Get("count")
  count(
    @CurrentUser() user: AccessTokenPayload,
    @Query(new ZodValidationPipe(candidateQueryParamsSchema)) query: CandidateQueryParams,
  ) {
    return this.candidatesService.count(user, query);
  }

  @Get("export")
  async exportFile(
    @CurrentUser() user: AccessTokenPayload,
    @Query(new ZodValidationPipe(exportCandidatesQuerySchema)) query: ExportCandidatesQuery,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { buffer, filename, mimeType, truncated } = await this.candidatesService.exportFile(
      user,
      query,
    );
    res.set({
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Export-Truncated": String(truncated),
    });
    return new StreamableFile(buffer);
  }

  @Post("import")
  @Roles("ADMIN", "HR_MANAGER", "RECRUITER")
  @UseInterceptors(FileInterceptor("file"))
  importFile(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    if (!file) {
      throw new BadRequestException("Thiếu file để import");
    }
    return this.candidatesService.importFile(user, file.buffer, file.mimetype);
  }

  @Get(":id")
  findOne(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string) {
    return this.candidatesService.findOne(user, id);
  }

  @Get(":id/stage-history")
  getStageHistory(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string) {
    return this.candidatesService.getStageHistory(user, id);
  }

  @Post()
  @Roles("ADMIN", "HR_MANAGER", "RECRUITER", "INTERVIEWER")
  create(
    @Body(new ZodValidationPipe(createCandidateSchema)) body: CreateCandidateInput,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.candidatesService.create(body, user);
  }

  @Patch("bulk-status")
  @Roles("ADMIN", "HR_MANAGER", "RECRUITER", "INTERVIEWER")
  bulkUpdateStatus(
    @Body(new ZodValidationPipe(bulkUpdateStatusSchema)) body: BulkUpdateStatusInput,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.candidatesService.bulkUpdateStatus(user, body.ids, body.statusId);
  }

  @Patch("bulk-recruiter")
  @Roles("ADMIN", "HR_MANAGER", "RECRUITER", "INTERVIEWER")
  bulkUpdateRecruiter(
    @Body(new ZodValidationPipe(bulkUpdateRecruiterSchema)) body: BulkUpdateRecruiterInput,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.candidatesService.bulkUpdateRecruiter(user, body.ids, body.recruiterId);
  }

  @Delete("bulk")
  @Roles("ADMIN", "HR_MANAGER", "RECRUITER")
  bulkRemove(
    @Body(new ZodValidationPipe(bulkDeleteCandidatesSchema)) body: BulkDeleteCandidatesInput,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.candidatesService.bulkSoftDelete(user, body.ids);
  }

  @Patch(":id")
  @Roles("ADMIN", "HR_MANAGER", "RECRUITER", "INTERVIEWER")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateCandidateFieldsSchema)) body: UpdateCandidateFieldsInput,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.candidatesService.updateFields(user, id, body);
  }

  @Delete(":id")
  @Roles("ADMIN", "HR_MANAGER", "RECRUITER")
  remove(@Param("id") id: string, @CurrentUser() user: AccessTokenPayload) {
    return this.candidatesService.softDelete(user, id);
  }

  @Post(":id/relations/:fieldKey")
  @Roles("ADMIN", "HR_MANAGER", "RECRUITER", "INTERVIEWER")
  addRelation(
    @Param("id") id: string,
    @Param("fieldKey") fieldKey: string,
    @Body(new ZodValidationPipe(createRecordLinkSchema)) body: CreateRecordLinkInput,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.candidatesService.addRelation(user, id, fieldKey, body.toRecordId);
  }

  @Delete(":id/relations/:fieldKey/:toRecordId")
  @Roles("ADMIN", "HR_MANAGER", "RECRUITER", "INTERVIEWER")
  removeRelation(
    @Param("id") id: string,
    @Param("fieldKey") fieldKey: string,
    @Param("toRecordId") toRecordId: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.candidatesService.removeRelation(user, id, fieldKey, toRecordId);
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  createEmailTemplateSchema,
  emailBlocksSchema,
  updateEmailTemplateSchema,
  type AccessTokenPayload,
  type CreateEmailTemplateInput,
  type EmailBlock,
  type UpdateEmailTemplateInput,
} from "@taga-crm/shared";
import { EmailTemplatesService } from "./email-templates.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("email-templates")
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailTemplatesController {
  constructor(private readonly emailTemplatesService: EmailTemplatesService) {}

  @Get()
  list() {
    return this.emailTemplatesService.list();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.emailTemplatesService.findById(id);
  }

  @Get(":id/preview")
  renderPreview(@Param("id") id: string) {
    return this.emailTemplatesService.renderPreview(id);
  }

  @Post("preview")
  renderBlocksPreview(
    @Body("blocks", new ZodValidationPipe(emailBlocksSchema)) blocks: EmailBlock[],
  ) {
    return this.emailTemplatesService.renderBlocksPreview(blocks);
  }

  @Post()
  @Roles("ADMIN", "HR_MANAGER")
  create(
    @Body(new ZodValidationPipe(createEmailTemplateSchema)) body: CreateEmailTemplateInput,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.emailTemplatesService.create(body, user.sub);
  }

  @Patch(":id")
  @Roles("ADMIN", "HR_MANAGER")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateEmailTemplateSchema)) body: UpdateEmailTemplateInput,
  ) {
    return this.emailTemplatesService.update(id, body);
  }

  @Delete(":id")
  @Roles("ADMIN", "HR_MANAGER")
  remove(@Param("id") id: string) {
    return this.emailTemplatesService.remove(id);
  }
}

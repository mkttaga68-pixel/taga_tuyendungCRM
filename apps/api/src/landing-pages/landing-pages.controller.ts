import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import {
  createLandingPageFormSchema,
  createLandingPageSchema,
  formSubmissionQuerySchema,
  updateLandingPageSchema,
  type AccessTokenPayload,
  type CreateLandingPageFormInput,
  type CreateLandingPageInput,
  type FormSubmissionQuery,
  type UpdateLandingPageInput,
} from "@taga-crm/shared";
import { LandingPagesService } from "./landing-pages.service";
import { LandingPageFormsService } from "./landing-page-forms.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("landing-pages")
@UseGuards(JwtAuthGuard, RolesGuard)
export class LandingPagesController {
  constructor(
    private readonly landingPagesService: LandingPagesService,
    private readonly formsService: LandingPageFormsService,
  ) {}

  @Get()
  list() {
    return this.landingPagesService.list();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.landingPagesService.findOne(id);
  }

  @Post()
  @Roles("ADMIN", "HR_MANAGER")
  create(
    @Body(new ZodValidationPipe(createLandingPageSchema)) body: CreateLandingPageInput,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.landingPagesService.create(body, user);
  }

  @Patch(":id")
  @Roles("ADMIN", "HR_MANAGER")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateLandingPageSchema)) body: UpdateLandingPageInput,
  ) {
    return this.landingPagesService.update(id, body);
  }

  @Delete(":id")
  @Roles("ADMIN", "HR_MANAGER")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string) {
    return this.landingPagesService.remove(id);
  }

  @Post(":id/regenerate-api-key")
  @Roles("ADMIN", "HR_MANAGER")
  regenerateApiKey(@Param("id") id: string) {
    return this.landingPagesService.regenerateApiKey(id);
  }

  @Get(":id/forms")
  listForms(@Param("id") id: string) {
    return this.formsService.listVersions(id);
  }

  @Get(":id/forms/active")
  getActiveForm(@Param("id") id: string) {
    return this.formsService.getActive(id);
  }

  @Post(":id/forms")
  @Roles("ADMIN", "HR_MANAGER")
  createFormVersion(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(createLandingPageFormSchema)) body: CreateLandingPageFormInput,
  ) {
    return this.formsService.createVersion(id, body.schema);
  }

  @Get(":id/submissions")
  @Roles("ADMIN", "HR_MANAGER", "RECRUITER")
  listSubmissions(
    @Param("id") id: string,
    @Query(new ZodValidationPipe(formSubmissionQuerySchema)) query: FormSubmissionQuery,
  ) {
    return this.landingPagesService.listSubmissions(id, query);
  }
}

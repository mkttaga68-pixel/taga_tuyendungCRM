import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  createMktCampaignSchema,
  updateMktCampaignSchema,
  createMktCampaignEmailSchema,
  updateMktCampaignEmailSchema,
  reorderMktCampaignEmailSchema,
  enrollContactSchema,
  type CreateMktCampaignInput,
  type UpdateMktCampaignInput,
  type CreateMktCampaignEmailInput,
  type UpdateMktCampaignEmailInput,
  type ReorderMktCampaignEmailInput,
  type EnrollContactInput,
  type AccessTokenPayload,
} from "@taga-crm/shared";
import { MktCampaignsService } from "./mkt-campaigns.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@Controller("mkt/campaigns")
@UseGuards(JwtAuthGuard)
export class MktCampaignsController {
  constructor(private readonly service: MktCampaignsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createMktCampaignSchema)) body: CreateMktCampaignInput,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.service.create(body, user);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateMktCampaignSchema)) body: UpdateMktCampaignInput,
  ) {
    return this.service.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }

  @Post(":id/activate")
  activate(@Param("id") id: string) {
    return this.service.activate(id);
  }

  @Post(":id/pause")
  pause(@Param("id") id: string) {
    return this.service.pause(id);
  }

  // ---- Sequence Emails ----

  @Get(":id/emails")
  listEmails(@Param("id") id: string) {
    return this.service.listEmails(id);
  }

  @Post(":id/emails")
  addEmail(
    @Param("id") campaignId: string,
    @Body(new ZodValidationPipe(createMktCampaignEmailSchema)) body: CreateMktCampaignEmailInput,
  ) {
    return this.service.addEmail(campaignId, body);
  }

  @Patch(":id/emails/:emailId")
  updateEmail(
    @Param("id") campaignId: string,
    @Param("emailId") emailId: string,
    @Body(new ZodValidationPipe(updateMktCampaignEmailSchema)) body: UpdateMktCampaignEmailInput,
  ) {
    return this.service.updateEmail(campaignId, emailId, body);
  }

  @Delete(":id/emails/:emailId")
  removeEmail(@Param("id") campaignId: string, @Param("emailId") emailId: string) {
    return this.service.removeEmail(campaignId, emailId);
  }

  @Post(":id/emails/:emailId/reorder")
  reorderEmail(
    @Param("id") campaignId: string,
    @Param("emailId") emailId: string,
    @Body(new ZodValidationPipe(reorderMktCampaignEmailSchema)) body: ReorderMktCampaignEmailInput,
  ) {
    return this.service.reorderEmail(campaignId, emailId, body.newPosition);
  }

  // ---- Enrollments ----

  @Get(":id/enrollments")
  listEnrollments(@Param("id") id: string) {
    return this.service.listEnrollments(id);
  }

  @Post(":id/enroll")
  enrollContacts(
    @Param("id") campaignId: string,
    @Body(new ZodValidationPipe(enrollContactSchema)) body: EnrollContactInput,
  ) {
    return this.service.enrollContacts(campaignId, body);
  }
}

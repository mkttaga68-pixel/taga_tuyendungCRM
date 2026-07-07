import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import {
  createMktLandingPageConfigSchema,
  type CreateMktLandingPageConfigInput,
} from "@taga-crm/shared";
import { MktLandingPageConfigService } from "./mkt-landing-page-config.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";

@Controller("mkt/landing-page-configs")
@UseGuards(JwtAuthGuard)
export class MktLandingPageConfigController {
  constructor(private readonly service: MktLandingPageConfigService) {}

  @Get(":landingPageId")
  findOne(@Param("landingPageId") landingPageId: string) {
    return this.service.findByLandingPage(landingPageId);
  }

  @Put(":landingPageId")
  upsert(
    @Param("landingPageId") landingPageId: string,
    @Body(new ZodValidationPipe(createMktLandingPageConfigSchema)) body: CreateMktLandingPageConfigInput,
  ) {
    return this.service.upsert(landingPageId, body);
  }
}

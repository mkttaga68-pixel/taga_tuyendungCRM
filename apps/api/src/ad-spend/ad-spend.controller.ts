import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import {
  adSpendListQuerySchema,
  createAdSpendSchema,
  type AccessTokenPayload,
  type AdSpendListQuery,
  type CreateAdSpendInput,
} from "@taga-crm/shared";
import { AdSpendService } from "./ad-spend.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("ad-spend")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "HR_MANAGER")
export class AdSpendController {
  constructor(private readonly adSpendService: AdSpendService) {}

  @Get()
  list(@Query(new ZodValidationPipe(adSpendListQuerySchema)) query: AdSpendListQuery) {
    return this.adSpendService.list(query);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createAdSpendSchema)) body: CreateAdSpendInput,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.adSpendService.create(body, user.sub);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.adSpendService.remove(id);
  }
}

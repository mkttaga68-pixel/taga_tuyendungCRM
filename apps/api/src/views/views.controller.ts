import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  createViewSchema,
  updateViewSchema,
  type AccessTokenPayload,
  type CreateViewInput,
  type UpdateViewInput,
} from "@taga-crm/shared";
import { ViewsService } from "./views.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ViewsController {
  constructor(private readonly viewsService: ViewsService) {}

  @Get("tables/:tableKey/views")
  listForTable(@Param("tableKey") tableKey: string, @CurrentUser() user: AccessTokenPayload) {
    return this.viewsService.listForTable(tableKey, user);
  }

  @Post("tables/:tableKey/views")
  create(
    @Param("tableKey") tableKey: string,
    @Body(new ZodValidationPipe(createViewSchema.omit({ tableKey: true })))
    body: Omit<CreateViewInput, "tableKey">,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.viewsService.create(tableKey, body, user);
  }

  @Patch("views/:id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateViewSchema)) body: UpdateViewInput,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.viewsService.update(id, body, user);
  }

  @Delete("views/:id")
  remove(@Param("id") id: string, @CurrentUser() user: AccessTokenPayload) {
    return this.viewsService.remove(id, user);
  }

  @Post("views/:id/set-default")
  setDefault(@Param("id") id: string, @CurrentUser() user: AccessTokenPayload) {
    return this.viewsService.setDefault(id, user);
  }
}

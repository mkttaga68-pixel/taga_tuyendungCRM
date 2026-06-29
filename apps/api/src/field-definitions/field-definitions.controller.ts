import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  createFieldDefinitionSchema,
  reorderFieldDefinitionsSchema,
  updateFieldDefinitionSchema,
  type AccessTokenPayload,
  type CreateFieldDefinitionInput,
  type ReorderFieldDefinitionsInput,
  type UpdateFieldDefinitionInput,
} from "@taga-crm/shared";
import { FieldDefinitionsService } from "./field-definitions.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class FieldDefinitionsController {
  constructor(private readonly fieldDefinitionsService: FieldDefinitionsService) {}

  @Get("tables/:tableKey/fields")
  findAll(@Param("tableKey") tableKey: string) {
    return this.fieldDefinitionsService.findAllByTable(tableKey);
  }

  @Post("tables/:tableKey/fields")
  @Roles("ADMIN", "HR_MANAGER")
  create(
    @Param("tableKey") tableKey: string,
    @Body(new ZodValidationPipe(createFieldDefinitionSchema.omit({ tableKey: true })))
    body: Omit<CreateFieldDefinitionInput, "tableKey">,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.fieldDefinitionsService.create({ ...body, tableKey }, user.sub);
  }

  @Post("tables/:tableKey/fields/reorder")
  @Roles("ADMIN", "HR_MANAGER")
  reorder(
    @Param("tableKey") tableKey: string,
    @Body(new ZodValidationPipe(reorderFieldDefinitionsSchema)) body: ReorderFieldDefinitionsInput,
  ) {
    return this.fieldDefinitionsService.reorder(tableKey, body.orderedIds);
  }

  @Patch("fields/:id")
  @Roles("ADMIN", "HR_MANAGER")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateFieldDefinitionSchema)) body: UpdateFieldDefinitionInput,
  ) {
    return this.fieldDefinitionsService.update(id, body);
  }

  @Delete("fields/:id")
  @Roles("ADMIN", "HR_MANAGER")
  remove(@Param("id") id: string) {
    return this.fieldDefinitionsService.remove(id);
  }
}

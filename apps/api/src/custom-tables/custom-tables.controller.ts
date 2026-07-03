import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import {
  createCustomTableSchema,
  updateCustomTableSchema,
  createCustomRecordSchema,
  updateCustomRecordSchema,
  customRecordQuerySchema,
  type CreateCustomTableInput,
  type UpdateCustomTableInput,
  type CreateCustomRecordInput,
  type UpdateCustomRecordInput,
  type CustomRecordQuery,
  type AccessTokenPayload,
} from "@taga-crm/shared";
import { CustomTablesService } from "./custom-tables.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomTablesController {
  constructor(private readonly service: CustomTablesService) {}

  @Get("custom-tables")
  listTables() {
    return this.service.listTables();
  }

  @Post("custom-tables")
  @Roles("ADMIN", "HR_MANAGER")
  createTable(
    @Body(new ZodValidationPipe(createCustomTableSchema)) body: CreateCustomTableInput,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.service.createTable(body, user.sub);
  }

  @Get("custom-tables/:tableKey")
  getTable(@Param("tableKey") tableKey: string) {
    return this.service.getTable(tableKey);
  }

  @Patch("custom-tables/:tableKey")
  @Roles("ADMIN", "HR_MANAGER")
  updateTable(
    @Param("tableKey") tableKey: string,
    @Body(new ZodValidationPipe(updateCustomTableSchema)) body: UpdateCustomTableInput,
  ) {
    return this.service.updateTable(tableKey, body);
  }

  @Delete("custom-tables/:tableKey")
  @Roles("ADMIN", "HR_MANAGER")
  deleteTable(@Param("tableKey") tableKey: string) {
    return this.service.deleteTable(tableKey);
  }

  @Get("tables/:tableKey/records")
  listRecords(
    @Param("tableKey") tableKey: string,
    @Query(new ZodValidationPipe(customRecordQuerySchema)) query: CustomRecordQuery,
  ) {
    return this.service.listRecords(tableKey, query.offset, query.limit);
  }

  @Post("tables/:tableKey/records")
  createRecord(
    @Param("tableKey") tableKey: string,
    @Body(new ZodValidationPipe(createCustomRecordSchema)) body: CreateCustomRecordInput,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.service.createRecord(tableKey, body, user.sub);
  }

  @Patch("records/:id")
  updateRecord(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateCustomRecordSchema)) body: UpdateCustomRecordInput,
  ) {
    return this.service.updateRecord(id, body);
  }

  @Delete("records/:id")
  deleteRecord(@Param("id") id: string) {
    return this.service.deleteRecord(id);
  }
}

import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { auditLogQuerySchema, type AuditLogQuery } from "@taga-crm/shared";
import { AuditLogService } from "./audit-log.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("audit-logs")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "HR_MANAGER")
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  list(@Query(new ZodValidationPipe(auditLogQuerySchema)) query: AuditLogQuery) {
    return this.auditLogService.list(query);
  }
}

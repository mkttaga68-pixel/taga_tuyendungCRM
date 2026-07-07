import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import {
  sendEmailSchema,
  type AccessTokenPayload,
  type EmailLogListQuery,
  type SendEmailInput,
} from "@taga-crm/shared";
import { EmailLogsService } from "./email-logs.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("email-logs")
export class EmailLogsController {
  constructor(private readonly emailLogsService: EmailLogsService) {}

  /** Webhook nhận email inbound từ Resend — không cần JWT (public endpoint). */
  @Post("inbound")
  receiveInbound(@Body() payload: unknown) {
    return this.emailLogsService.receiveInbound(payload);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  list(
    @Query("direction") direction?: string,
    @Query("status") status?: string,
    @Query("candidateId") candidateId?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const query: EmailLogListQuery = {
      direction: direction as EmailLogListQuery["direction"],
      status: status as EmailLogListQuery["status"],
      candidateId,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    };
    return this.emailLogsService.list(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.emailLogsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(":id/read")
  markAsRead(@Param("id") id: string) {
    return this.emailLogsService.markAsRead(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post("send")
  send(
    @Body(new ZodValidationPipe(sendEmailSchema)) body: SendEmailInput,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.emailLogsService.send(body, user);
  }
}

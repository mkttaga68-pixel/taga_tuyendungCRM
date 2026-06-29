import { Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { AccessTokenPayload } from "@taga-crm/shared";
import { NotificationsService } from "./notifications.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query("offset") offset?: string,
    @Query("limit") limit?: string,
  ) {
    const parsedOffset = Math.max(Number(offset) || 0, 0);
    const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    return this.notificationsService.list(user.sub, parsedOffset, parsedLimit);
  }

  @Get("unread-count")
  unreadCount(@CurrentUser() user: AccessTokenPayload) {
    return this.notificationsService.unreadCount(user.sub);
  }

  @Patch(":id/read")
  markRead(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string) {
    return this.notificationsService.markRead(user.sub, id);
  }

  @Post("read-all")
  markAllRead(@CurrentUser() user: AccessTokenPayload) {
    return this.notificationsService.markAllRead(user.sub);
  }
}

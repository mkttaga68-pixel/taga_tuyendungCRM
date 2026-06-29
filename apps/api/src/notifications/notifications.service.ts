import { Injectable } from "@nestjs/common";
import type { Notification } from "@prisma/client";
import type { NotificationDto, NotificationListResponse } from "@taga-crm/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, offset: number, limit: number): Promise<NotificationListResponse> {
    const [rows, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit + 1,
      }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return { items: page.map((row) => this.toDto(row)), unreadCount, hasMore };
  }

  async unreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { unreadCount };
  }

  async markRead(userId: string, id: string): Promise<{ success: true }> {
    await this.prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
    return { success: true };
  }

  async markAllRead(userId: string): Promise<{ success: true }> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  private toDto(row: Notification): NotificationDto {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      link: row.link,
      isRead: row.isRead,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

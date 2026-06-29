import { apiRequest } from "./api-client";
import type { NotificationListResponse } from "@taga-crm/shared";

export function listNotifications(offset = 0, limit = 20) {
  return apiRequest<NotificationListResponse>(`/notifications?offset=${offset}&limit=${limit}`);
}

export function getUnreadCount() {
  return apiRequest<{ unreadCount: number }>("/notifications/unread-count");
}

export function markNotificationRead(id: string) {
  return apiRequest<{ success: true }>(`/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead() {
  return apiRequest<{ success: true }>("/notifications/read-all", { method: "POST" });
}

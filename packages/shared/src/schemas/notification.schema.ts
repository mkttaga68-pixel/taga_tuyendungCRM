export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  items: NotificationDto[];
  unreadCount: number;
  hasMore: boolean;
}

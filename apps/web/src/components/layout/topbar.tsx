"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Bell, Moon, Search, Sun, LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth-store";
import { logout as logoutApi } from "@/lib/auth-api";
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications-api";
import { ROLE_LABELS } from "@taga-crm/shared";

const NOTIFICATIONS_POLL_MS = 30_000;

function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const unreadQuery = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadCount,
    refetchInterval: NOTIFICATIONS_POLL_MS,
  });

  const listQuery = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => listNotifications(0, 20),
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = unreadQuery.data?.unreadCount ?? 0;
  const items = listQuery.data?.items ?? [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Thông báo" className="relative">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Thông báo</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              Đánh dấu đã đọc tất cả
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-auto">
          {items.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Chưa có thông báo nào.
            </p>
          )}
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                if (!n.isRead) markReadMutation.mutate(n.id);
                if (n.link) router.push(n.link);
              }}
              className={`block w-full border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted/50 ${
                n.isRead ? "" : "bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-2">
                {!n.isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                <span className="font-medium">{n.title}</span>
              </div>
              {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: vi })}
              </p>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function initialsOf(fullName: string) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Topbar() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  async function handleLogout() {
    try {
      await logoutApi();
    } finally {
      clear();
      router.push("/login");
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />

      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Tìm ứng viên, SĐT, email..." className="pl-8" />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Đổi giao diện sáng/tối"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="size-4 scale-100 dark:scale-0" />
          <Moon className="absolute size-4 scale-0 dark:scale-100" />
        </Button>

        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="ml-1 gap-2 px-2">
              <Avatar className="size-7">
                <AvatarFallback className="text-xs">
                  {user ? initialsOf(user.fullName) : "?"}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">
                {user?.fullName ?? "Đang tải..."}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{user?.fullName}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground">
                {user ? ROLE_LABELS[user.role] : null}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} variant="destructive">
              <LogOut className="size-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

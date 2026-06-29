import {
  LayoutDashboard,
  Users,
  Globe,
  ClipboardList,
  Workflow,
  Mail,
  CalendarClock,
  BarChart3,
  History,
  UserCog,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@taga-crm/shared";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Để trống = mọi role đã đăng nhập đều thấy. */
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Ứng viên", href: "/candidates", icon: Users },
  { label: "Landing Page", href: "/landing-pages", icon: Globe },
  { label: "Form Builder", href: "/forms", icon: ClipboardList },
  { label: "Automation", href: "/automation", icon: Workflow },
  { label: "Email Template", href: "/email-templates", icon: Mail },
  { label: "Lịch phỏng vấn", href: "/interviews", icon: CalendarClock },
  { label: "Báo cáo", href: "/reports", icon: BarChart3 },
  { label: "Audit Log", href: "/audit-log", icon: History, roles: ["ADMIN", "HR_MANAGER"] },
  {
    label: "Người dùng & Phân quyền",
    href: "/users",
    icon: UserCog,
    roles: ["ADMIN"],
  },
  { label: "Cài đặt", href: "/settings", icon: Settings },
];

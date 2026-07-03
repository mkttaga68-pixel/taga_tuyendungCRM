"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Plus, Table2, Trash2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS } from "./nav-items";
import { useAuthStore } from "@/stores/auth-store";
import { createCustomTable, deleteCustomTable, listCustomTables } from "@/lib/custom-tables-api";
import { ApiError } from "@/lib/api-client";
import type { Role } from "@taga-crm/shared";

const MANAGE_TABLE_ROLES: Role[] = ["ADMIN", "HR_MANAGER"];

export function AppSidebar() {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.role);
  const queryClient = useQueryClient();

  const [candidatesOpen, setCandidatesOpen] = useState(
    pathname === "/candidates" || pathname.startsWith("/tables/"),
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");

  const tablesQuery = useQuery({
    queryKey: ["custom-tables"],
    queryFn: listCustomTables,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: () => createCustomTable({ name: newTableName.trim() }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["custom-tables"] });
      setCreateOpen(false);
      setNewTableName("");
      toast.success(`Đã tạo bảng "${created.name}"`);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Không thể tạo bảng");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (tableKey: string) => deleteCustomTable(tableKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-tables"] });
      toast.success("Đã xoá bảng");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Không thể xoá bảng");
    },
  });

  const items = NAV_ITEMS.filter(
    (item) => item.href !== "/candidates" && (!item.roles || (role && item.roles.includes(role))),
  );

  const canManage = role && MANAGE_TABLE_ROLES.includes(role);
  const customTables = tablesQuery.data ?? [];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            T
          </div>
          <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">
            Taga CRM
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Ứng viên — mục mở rộng chứa candidates + custom tables */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/candidates" || pathname.startsWith("/tables/")}
                  onClick={() => setCandidatesOpen((o) => !o)}
                  className="w-full"
                  tooltip="Ứng viên"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span className="flex-1">Ứng viên</span>
                  {candidatesOpen ? (
                    <ChevronDown className="size-3.5 shrink-0 group-data-[collapsible=icon]:hidden" />
                  ) : (
                    <ChevronRight className="size-3.5 shrink-0 group-data-[collapsible=icon]:hidden" />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Sub-items */}
              {candidatesOpen && (
                <div className="group-data-[collapsible=icon]:hidden ml-3 border-l pl-2 space-y-0.5">
                  {/* Bảng mặc định: Ứng viên */}
                  <Link
                    href="/candidates"
                    className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors ${
                      pathname === "/candidates"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <Table2 className="size-3.5 shrink-0" />
                    Ứng viên
                  </Link>

                  {/* Custom tables */}
                  {customTables.map((t) => (
                    <div key={t.tableKey} className="group/item flex items-center gap-1">
                      <Link
                        href={`/tables/${t.tableKey}`}
                        className={`flex flex-1 items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors ${
                          pathname === `/tables/${t.tableKey}`
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <Table2 className="size-3.5 shrink-0" />
                        <span className="truncate">{t.name}</span>
                      </Link>
                      {canManage && (
                        <button
                          type="button"
                          title="Xoá bảng"
                          className="hidden group-hover/item:flex size-5 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Xoá bảng "${t.name}"? Tất cả bản ghi sẽ bị xoá.`)) {
                              deleteMutation.mutate(t.tableKey);
                            }
                          }}
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Thêm bảng */}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => setCreateOpen(true)}
                      className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    >
                      <Plus className="size-3.5" />
                      Thêm bảng
                    </button>
                  )}
                </div>
              )}

              {/* Other nav items (excluding /candidates which we handle above) */}
              {items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />

      {/* Dialog tạo bảng mới */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setNewTableName(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm bảng mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-table-name">Tên bảng</Label>
            <Input
              id="new-table-name"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              placeholder="Ví dụ: Nhân sự nội bộ"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTableName.trim()) createMutation.mutate();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newTableName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Đang tạo..." : "Tạo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}

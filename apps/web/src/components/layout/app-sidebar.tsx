"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Pencil, Plus, Table2, Trash2 } from "lucide-react";
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
import {
  createCustomTable,
  deleteCustomTable,
  listCustomTables,
  updateCustomTable,
} from "@/lib/custom-tables-api";
import { getUiSettings, updateUiSettings } from "@/lib/settings-api";
import { ApiError } from "@/lib/api-client";
import type { Role } from "@taga-crm/shared";

const MANAGE_TABLE_ROLES: Role[] = ["ADMIN", "HR_MANAGER"];

export function AppSidebar() {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.role);
  const queryClient = useQueryClient();

  const [tablesOpen, setTablesOpen] = useState(
    pathname === "/candidates" || pathname.startsWith("/tables/"),
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");

  // Rename inline state — dùng chung cho "candidates" (built-in) và custom tables
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const tablesQuery = useQuery({
    queryKey: ["custom-tables"],
    queryFn: listCustomTables,
    staleTime: 30_000,
  });

  const uiSettingsQuery = useQuery({
    queryKey: ["ui-settings"],
    queryFn: getUiSettings,
    staleTime: 60_000,
  });
  const candidatesTableName = uiSettingsQuery.data?.candidatesTableName ?? "Ứng viên";

  const renameCandidatesMutation = useMutation({
    mutationFn: (name: string) => updateUiSettings({ candidatesTableName: name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ui-settings"] });
      setRenamingKey(null);
      toast.success("Đã đổi tên bảng");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Không thể đổi tên");
    },
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

  const renameMutation = useMutation({
    mutationFn: ({ tableKey, name }: { tableKey: string; name: string }) =>
      updateCustomTable(tableKey, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-tables"] });
      setRenamingKey(null);
      toast.success("Đã đổi tên bảng");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Không thể đổi tên");
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

  function startRename(tableKey: string, currentName: string) {
    setRenamingKey(tableKey);
    setRenameValue(currentName);
  }

  function commitRename(tableKey: string) {
    const trimmed = renameValue.trim();
    if (!trimmed) { setRenamingKey(null); return; }
    if (tableKey === "candidates") {
      renameCandidatesMutation.mutate(trimmed);
    } else {
      renameMutation.mutate({ tableKey, name: trimmed });
    }
  }

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
              {/* Bảng — nhóm chứa candidates + custom tables */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/candidates" || pathname.startsWith("/tables/")}
                  onClick={() => setTablesOpen((o) => !o)}
                  className="w-full"
                  tooltip="Bảng"
                >
                  <Table2 className="size-4" />
                  <span className="flex-1">Bảng</span>
                  {tablesOpen ? (
                    <ChevronDown className="size-3.5 shrink-0 group-data-[collapsible=icon]:hidden" />
                  ) : (
                    <ChevronRight className="size-3.5 shrink-0 group-data-[collapsible=icon]:hidden" />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Sub-items */}
              {tablesOpen && (
                <div className="group-data-[collapsible=icon]:hidden ml-3 border-l pl-2 space-y-0.5">
                  {/* Bảng mặc định: Ứng viên (có thể đổi tên) */}
                  <div className="group/item flex items-center gap-0.5">
                    {renamingKey === "candidates" ? (
                      <div className="flex flex-1 items-center gap-1 px-1">
                        <Input
                          className="h-6 py-0 text-xs"
                          value={renameValue}
                          autoFocus
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename("candidates");
                            if (e.key === "Escape") setRenamingKey(null);
                          }}
                          onBlur={() => commitRename("candidates")}
                        />
                      </div>
                    ) : (
                      <Link
                        href="/candidates"
                        className={`flex flex-1 items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors ${
                          pathname === "/candidates"
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <Table2 className="size-3.5 shrink-0" />
                        <span className="truncate">{candidatesTableName}</span>
                      </Link>
                    )}
                    {canManage && renamingKey !== "candidates" && (
                      <div className="hidden group-hover/item:flex items-center gap-0.5">
                        <button
                          type="button"
                          title="Đổi tên"
                          className="size-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                          onClick={() => startRename("candidates", candidatesTableName)}
                        >
                          <Pencil className="size-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Custom tables */}
                  {customTables.map((t) => (
                    <div key={t.tableKey} className="group/item flex items-center gap-0.5">
                      {renamingKey === t.tableKey ? (
                        <div className="flex flex-1 items-center gap-1 px-1">
                          <Input
                            className="h-6 py-0 text-xs"
                            value={renameValue}
                            autoFocus
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRename(t.tableKey);
                              if (e.key === "Escape") setRenamingKey(null);
                            }}
                            onBlur={() => commitRename(t.tableKey)}
                          />
                        </div>
                      ) : (
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
                      )}
                      {canManage && renamingKey !== t.tableKey && (
                        <div className="hidden group-hover/item:flex items-center gap-0.5">
                          <button
                            type="button"
                            title="Đổi tên"
                            className="size-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                            onClick={() => startRename(t.tableKey, t.name)}
                          >
                            <Pencil className="size-3" />
                          </button>
                          <button
                            type="button"
                            title="Xoá bảng"
                            className="size-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              if (confirm(`Xoá bảng "${t.name}"? Tất cả bản ghi sẽ bị xoá.`)) {
                                deleteMutation.mutate(t.tableKey);
                              }
                            }}
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
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

              {/* Other nav items */}
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

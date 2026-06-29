"use client";

import { ChevronDown, KanbanSquare, Plus, Table2, Users } from "lucide-react";
import type { ViewDto, ViewTypeValue } from "@taga-crm/shared";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ViewTabsProps {
  views: ViewDto[];
  activeViewId: string | null;
  currentUserId: string;
  canManageShared: boolean;
  onSelect: (id: string) => void;
  onCreate: (type: ViewTypeValue) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

export function ViewTabs({
  views,
  activeViewId,
  currentUserId,
  canManageShared,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onSetDefault,
}: ViewTabsProps) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-0.5 border-b bg-muted/20 px-2">
      {views.map((view) => {
        const isOwner = view.ownerId === currentUserId;
        const canMutate = view.ownerId === null ? canManageShared : isOwner;
        const isActive = view.id === activeViewId;
        return (
          <div
            key={view.id}
            className={cn(
              "group flex h-9 items-center gap-1 border-b-2 border-transparent px-2 text-sm",
              isActive
                ? "border-primary font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <button className="flex items-center gap-1.5" onClick={() => onSelect(view.id)}>
              {view.ownerId === null ? (
                <Table2 className="size-3.5" />
              ) : (
                <Users className="size-3.5" />
              )}
              {view.name}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "rounded p-0.5 opacity-0 hover:bg-accent group-hover:opacity-100",
                    isActive && "opacity-60",
                  )}
                >
                  <ChevronDown className="size-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {canMutate && (
                  <DropdownMenuItem
                    onClick={() => {
                      const name = window.prompt("Tên view mới:", view.name);
                      if (name?.trim()) onRename(view.id, name.trim());
                    }}
                  >
                    Đổi tên
                  </DropdownMenuItem>
                )}
                {canManageShared && !view.isDefault && (
                  <DropdownMenuItem onClick={() => onSetDefault(view.id)}>
                    Đặt làm view mặc định
                  </DropdownMenuItem>
                )}
                {canMutate && !view.isDefault && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => onDelete(view.id)}>
                      Xoá view
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className="ml-1 h-7 gap-1 px-2">
            <Plus className="size-3.5" />
            Thêm chế độ xem
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onCreate("GRID")}>
            <Table2 className="size-3.5" /> Lưới (Grid)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onCreate("KANBAN")}>
            <KanbanSquare className="size-3.5" /> Kanban
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

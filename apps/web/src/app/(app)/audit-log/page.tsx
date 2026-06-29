"use client";

import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import type { AuditAction } from "@taga-crm/shared";
import { listAuditLogs } from "@/lib/audit-log-api";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const ENTITY_TABLE_OPTIONS = [{ value: "candidates", label: "Ứng viên" }];
const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: "Tạo mới",
  UPDATE: "Sửa",
  DELETE: "Xoá",
};
const ACTION_BADGE_VARIANT: Record<AuditAction, "default" | "secondary" | "destructive"> = {
  CREATE: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function AuditLogPage() {
  const user = useAuthStore((s) => s.user);
  const canView = user?.role === "ADMIN" || user?.role === "HR_MANAGER";

  const [entityTable, setEntityTable] = useState<string | undefined>(undefined);
  const [action, setAction] = useState<AuditAction | undefined>(undefined);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const queryParams = useMemo(
    () => ({
      entityTable,
      action,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [entityTable, action, dateFrom, dateTo],
  );

  const query = useInfiniteQuery({
    queryKey: ["audit-logs", queryParams],
    queryFn: ({ pageParam }) => listAuditLogs({ ...queryParams, offset: pageParam, limit: 50 }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.flatMap((p) => p.items).length : undefined,
    enabled: canView,
  });

  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);

  if (!canView) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Bạn không có quyền xem Audit Log — chỉ Admin/HR Manager mới truy cập được.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden p-6">
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-xl font-semibold">Audit Log</h1>
        <span className="text-sm text-muted-foreground">Lịch sử thay đổi dữ liệu trong hệ thống</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          value={entityTable ?? "all"}
          onValueChange={(v) => setEntityTable(v === "all" ? undefined : v)}
        >
          <SelectTrigger className="h-8 w-40">
            <SelectValue placeholder="Đối tượng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả đối tượng</SelectItem>
            {ENTITY_TABLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={action ?? "all"}
          onValueChange={(v) => setAction(v === "all" ? undefined : (v as AuditAction))}
        >
          <SelectTrigger className="h-8 w-36">
            <SelectValue placeholder="Hành động" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả hành động</SelectItem>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-8 rounded-md border px-2 text-sm"
          aria-label="Từ ngày"
        />
        <span className="text-sm text-muted-foreground">đến</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="h-8 rounded-md border px-2 text-sm"
          aria-label="Đến ngày"
        />
      </div>

      <div className="flex-1 overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/60">
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Thời gian</th>
              <th className="px-3 py-2 font-medium">Người thực hiện</th>
              <th className="px-3 py-2 font-medium">Đối tượng</th>
              <th className="px-3 py-2 font-medium">Hành động</th>
              <th className="px-3 py-2 font-medium">Trường</th>
              <th className="px-3 py-2 font-medium">Giá trị cũ</th>
              <th className="px-3 py-2 font-medium">Giá trị mới</th>
            </tr>
          </thead>
          <tbody>
            {items.map((log) => (
              <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                  {format(new Date(log.changedAt), "dd/MM/yyyy HH:mm:ss")}
                </td>
                <td className="px-3 py-2">{log.changedByName ?? "—"}</td>
                <td className="px-3 py-2">{log.entityLabel ?? log.entityId.slice(0, 8)}</td>
                <td className="px-3 py-2">
                  <Badge variant={ACTION_BADGE_VARIANT[log.action]}>{ACTION_LABELS[log.action]}</Badge>
                </td>
                <td className="px-3 py-2">{log.fieldName ?? "—"}</td>
                <td className="max-w-50 truncate px-3 py-2 text-muted-foreground">
                  {formatValue(log.oldValue)}
                </td>
                <td className="max-w-50 truncate px-3 py-2">{formatValue(log.newValue)}</td>
              </tr>
            ))}
            {items.length === 0 && !query.isLoading && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  Chưa có lịch sử thay đổi nào khớp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {query.hasNextPage && (
        <div className="mt-3 flex justify-center">
          <Button
            size="sm"
            variant="outline"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? "Đang tải..." : "Tải thêm"}
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  SUBMISSION_PROCESSING_STATUSES,
  SUBMISSION_PROCESSING_STATUS_LABELS,
  type SubmissionProcessingStatus,
} from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listSubmissions } from "@/lib/landing-pages-api";

const STATUS_BADGE_VARIANT: Record<
  SubmissionProcessingStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "outline",
  PROCESSED: "default",
  DUPLICATE: "secondary",
  ERROR: "destructive",
};

export function SubmissionsTab({ landingPageId }: { landingPageId: string }) {
  const [statusFilter, setStatusFilter] = useState<SubmissionProcessingStatus | undefined>(
    undefined,
  );

  const query = useInfiniteQuery({
    queryKey: ["landing-pages", landingPageId, "submissions", statusFilter],
    queryFn: ({ pageParam }) =>
      listSubmissions(landingPageId, { processingStatus: statusFilter, offset: pageParam, limit: 50 }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.flatMap((p) => p.items).length : undefined,
  });

  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);

  return (
    <div className="space-y-3 pt-4">
      <Select
        value={statusFilter ?? "all"}
        onValueChange={(v) =>
          setStatusFilter(v === "all" ? undefined : (v as SubmissionProcessingStatus))
        }
      >
        <SelectTrigger className="h-8 w-48">
          <SelectValue placeholder="Trạng thái xử lý" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả trạng thái</SelectItem>
          {SUBMISSION_PROCESSING_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {SUBMISSION_PROCESSING_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/60">
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Thời gian</th>
              <th className="px-3 py-2 font-medium">Ứng viên</th>
              <th className="px-3 py-2 font-medium">Trạng thái</th>
              <th className="px-3 py-2 font-medium">IP</th>
              <th className="px-3 py-2 font-medium">Thiết bị</th>
              <th className="px-3 py-2 font-medium">UTM Source</th>
              <th className="px-3 py-2 font-medium">Lỗi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                  {new Date(s.submittedAt).toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-2">{s.candidateName ?? "—"}</td>
                <td className="px-3 py-2">
                  <Badge variant={STATUS_BADGE_VARIANT[s.processingStatus]}>
                    {SUBMISSION_PROCESSING_STATUS_LABELS[s.processingStatus]}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{s.ip ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{s.device ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{s.utmSource ?? "—"}</td>
                <td className="max-w-50 truncate px-3 py-2 text-destructive">
                  {s.errorMessage ?? "—"}
                </td>
              </tr>
            ))}
            {items.length === 0 && !query.isLoading && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  Chưa có submission nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {query.hasNextPage && (
        <div className="flex justify-center">
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

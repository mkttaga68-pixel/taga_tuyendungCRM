"use client";

import { useMemo, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AUTOMATION_RUN_STATUS_LABELS, type AutomationRunStatus } from "@taga-crm/shared";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cleanupStaleRuns, listWorkflowRuns } from "@/lib/automation-api";

const STATUS_BADGE_VARIANT: Record<AutomationRunStatus, "default" | "secondary" | "destructive"> = {
  RUNNING: "secondary",
  SUCCESS: "default",
  FAILED: "destructive",
};

export function RunHistoryTab({ workflowId }: { workflowId: string }) {
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const cleanupMutation = useMutation({
    mutationFn: cleanupStaleRuns,
    onSuccess: (data) => {
      toast.success(`Đã dọn ${data.count} run bị treo — làm mới danh sách`);
      void queryClient.invalidateQueries({ queryKey: ["automation-workflows", workflowId, "runs"] });
    },
    onError: () => toast.error("Không thể dọn dẹp — thử lại sau"),
  });

  const query = useInfiniteQuery({
    queryKey: ["automation-workflows", workflowId, "runs"],
    queryFn: ({ pageParam }) => listWorkflowRuns(workflowId, { offset: pageParam, limit: 20 }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.flatMap((p) => p.items).length : undefined,
    refetchInterval: 5000,
  });

  const runs = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);

  const hasStuckRuns = runs.some((r) => r.status === "RUNNING");

  return (
    <div className="space-y-2 pt-4">
      {hasStuckRuns && (
        <div className="flex items-center justify-between rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
          <span>Có run đang bị treo "Đang chạy" — có thể worker chưa xử lý.</span>
          <Button
            size="sm"
            variant="outline"
            className="ml-3 shrink-0"
            onClick={() => cleanupMutation.mutate()}
            disabled={cleanupMutation.isPending}
          >
            {cleanupMutation.isPending ? "Đang dọn..." : "Dọn runs bị treo"}
          </Button>
        </div>
      )}
      {runs.map((run) => (
        <div key={run.id} className="rounded-md border">
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/30"
            onClick={() => setExpandedRunId(expandedRunId === run.id ? null : run.id)}
          >
            <span>
              {new Date(run.startedAt).toLocaleString("vi-VN")}
              {run.triggerRecordId && (
                <span className="ml-2 text-xs text-muted-foreground">
                  trigger: {run.triggerRecordId.slice(0, 8)}
                </span>
              )}
            </span>
            <Badge variant={STATUS_BADGE_VARIANT[run.status]}>
              {AUTOMATION_RUN_STATUS_LABELS[run.status]}
            </Badge>
          </button>
          {expandedRunId === run.id && (
            <div className="space-y-1 border-t p-3 text-xs">
              {run.errorMessage && <p className="text-destructive">{run.errorMessage}</p>}
              {run.logs.map((log) => (
                <div key={log.id} className="rounded border p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium">{log.nodeKey}</span>
                    <Badge variant={STATUS_BADGE_VARIANT[log.status]} className="text-[10px]">
                      {AUTOMATION_RUN_STATUS_LABELS[log.status]}
                    </Badge>
                  </div>
                  {log.errorMessage && <p className="mt-1 text-destructive">{log.errorMessage}</p>}
                  {log.output != null && (
                    <pre className="mt-1 overflow-x-auto text-[10px] text-muted-foreground">
                      {JSON.stringify(log.output, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {runs.length === 0 && !query.isLoading && (
        <p className="text-sm text-muted-foreground">Chưa có lần chạy nào.</p>
      )}
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

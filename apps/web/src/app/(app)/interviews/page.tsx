"use client";

import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  INTERVIEW_RESULTS,
  INTERVIEW_RESULT_LABELS,
  type InterviewResult,
} from "@taga-crm/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listInterviews } from "@/lib/interviews-api";

const RESULT_BADGE_VARIANT: Record<InterviewResult, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  PASSED: "default",
  FAILED: "destructive",
  RESCHEDULED: "secondary",
  NO_SHOW: "secondary",
};

export default function InterviewsPage() {
  const [resultFilter, setResultFilter] = useState<InterviewResult | undefined>(undefined);

  const query = useInfiniteQuery({
    queryKey: ["interviews", resultFilter],
    queryFn: ({ pageParam }) => listInterviews({ result: resultFilter, offset: pageParam, limit: 50 }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.flatMap((p) => p.items).length : undefined,
  });

  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);

  return (
    <div className="flex h-full flex-col overflow-hidden p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Lịch phỏng vấn</h1>
        <p className="text-muted-foreground">
          Toàn bộ lịch phỏng vấn — Recruiter chỉ thấy ứng viên mình phụ trách, Interviewer chỉ thấy
          lịch được gán cho mình.
        </p>
      </div>

      <div className="mb-3">
        <Select
          value={resultFilter ?? "all"}
          onValueChange={(v) => setResultFilter(v === "all" ? undefined : (v as InterviewResult))}
        >
          <SelectTrigger className="h-8 w-44">
            <SelectValue placeholder="Kết quả" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả kết quả</SelectItem>
            {INTERVIEW_RESULTS.map((r) => (
              <SelectItem key={r} value={r}>
                {INTERVIEW_RESULT_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/60">
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Ngày</th>
              <th className="px-3 py-2 font-medium">Giờ</th>
              <th className="px-3 py-2 font-medium">Ứng viên</th>
              <th className="px-3 py-2 font-medium">Vòng</th>
              <th className="px-3 py-2 font-medium">Người phỏng vấn</th>
              <th className="px-3 py-2 font-medium">Địa điểm</th>
              <th className="px-3 py-2 font-medium">Kết quả</th>
            </tr>
          </thead>
          <tbody>
            {items.map((interview) => (
              <tr key={interview.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-3 py-2 whitespace-nowrap">{interview.scheduledDate}</td>
                <td className="px-3 py-2 whitespace-nowrap">{interview.scheduledTime}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/candidates?candidateId=${interview.candidateId}`}
                    className="font-medium hover:underline"
                  >
                    {interview.candidateName}
                  </Link>
                </td>
                <td className="px-3 py-2">{interview.round}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {interview.interviewer?.fullName ?? "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{interview.location ?? "—"}</td>
                <td className="px-3 py-2">
                  <Badge variant={RESULT_BADGE_VARIANT[interview.result]}>
                    {INTERVIEW_RESULT_LABELS[interview.result]}
                  </Badge>
                </td>
              </tr>
            ))}
            {items.length === 0 && !query.isLoading && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  Chưa có lịch phỏng vấn nào khớp bộ lọc.
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

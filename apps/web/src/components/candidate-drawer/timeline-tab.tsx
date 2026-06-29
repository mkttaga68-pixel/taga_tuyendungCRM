"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { getCandidateStageHistory } from "@/lib/candidates-api";

export function TimelineTab({ candidateId }: { candidateId: string }) {
  const query = useQuery({
    queryKey: ["candidates", candidateId, "stage-history"],
    queryFn: () => getCandidateStageHistory(candidateId),
  });

  const items = query.data ?? [];

  return (
    <div className="space-y-3 pt-4">
      {items.length === 0 && !query.isLoading && (
        <p className="text-sm text-muted-foreground">Chưa có lịch sử thay đổi trạng thái.</p>
      )}
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-3 rounded-md border p-3 text-sm">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {item.fromStage ? (
                <>
                  <span
                    className="rounded px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: `${item.fromStage.color}33` }}
                  >
                    {item.fromStage.label}
                  </span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </>
              ) : (
                <span className="text-xs text-muted-foreground">Tạo mới →</span>
              )}
              <span
                className="rounded px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${item.toStage.color}33` }}
              >
                {item.toStage.label}
              </span>
            </div>
            {item.note && <p className="mt-1 text-muted-foreground">{item.note}</p>}
            <p className="mt-1 text-xs text-muted-foreground">
              {item.changedBy?.fullName ?? "Hệ thống"} ·{" "}
              {new Date(item.changedAt).toLocaleString("vi-VN")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

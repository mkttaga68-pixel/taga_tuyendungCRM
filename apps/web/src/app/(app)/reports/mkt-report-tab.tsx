"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getMktDashboard, listMktCampaigns } from "@/lib/mkt-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nháp",
  ACTIVE: "Đang chạy",
  PAUSED: "Tạm dừng",
  ARCHIVED: "Lưu trữ",
};
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  ACTIVE: "default",
  PAUSED: "outline",
  ARCHIVED: "destructive",
};

export function MktReportTab() {
  const { data: stats } = useQuery({ queryKey: ["mkt-dashboard"], queryFn: getMktDashboard });
  const { data: campaigns = [] } = useQuery({ queryKey: ["mkt-campaigns"], queryFn: listMktCampaigns });

  return (
    <div className="space-y-6 pt-4">
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Tổng Contacts", value: stats.totalContacts.toLocaleString() },
            { label: "Danh sách", value: stats.totalLists },
            { label: "Chiến dịch", value: stats.totalCampaigns },
            { label: "Emails đã gửi", value: stats.totalEmailsSent.toLocaleString() },
            { label: "Open Rate", value: `${stats.overallOpenRate}%` },
            { label: "CTR", value: `${stats.overallCtr}%` },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg border bg-card p-3">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-xl font-bold mt-0.5">{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Tất cả chiến dịch</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/marketing/campaigns"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Quản lý</Link>
          </Button>
        </div>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Chiến dịch</th>
                <th className="text-left px-4 py-2 font-medium">Trạng thái</th>
                <th className="text-right px-4 py-2 font-medium">Emails</th>
                <th className="text-right px-4 py-2 font-medium">Enrollments</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted-foreground text-xs">
                    Chưa có chiến dịch nào
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium">{c.name}</td>
                    <td className="px-4 py-2">
                      <Badge variant={STATUS_VARIANTS[c.status] ?? "secondary"}>
                        {STATUS_LABELS[c.status] ?? c.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{c.emailCount}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{c.enrollmentCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

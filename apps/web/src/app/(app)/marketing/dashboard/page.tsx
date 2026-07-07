"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, ListFilter, Megaphone, Mail, TrendingUp, MousePointerClick } from "lucide-react";
import { getMktDashboard } from "@/lib/mkt-api";
import { Badge } from "@/components/ui/badge";

function KpiCard({
  label,
  value,
  icon: Icon,
  unit,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  unit?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-2xl font-bold">
        {value}
        {unit && <span className="ml-1 text-base font-normal text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

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

export default function MktDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["mkt-dashboard"],
    queryFn: getMktDashboard,
  });

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Marketing Hub — Tổng quan</h1>
        <p className="text-muted-foreground text-sm">Số liệu tổng hợp chiến dịch email marketing</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg border bg-muted animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <KpiCard label="Tổng Contacts" value={data.totalContacts.toLocaleString()} icon={Users} />
            <KpiCard label="Danh sách" value={data.totalLists} icon={ListFilter} />
            <KpiCard label="Chiến dịch" value={data.totalCampaigns} icon={Megaphone} />
            <KpiCard label="Email đã gửi" value={data.totalEmailsSent.toLocaleString()} icon={Mail} />
            <KpiCard label="Open Rate" value={data.overallOpenRate} unit="%" icon={TrendingUp} />
            <KpiCard label="CTR" value={data.overallCtr} unit="%" icon={MousePointerClick} />
          </div>

          <div>
            <h2 className="text-base font-semibold mb-3">Chiến dịch gần đây</h2>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Chiến dịch</th>
                    <th className="text-left px-4 py-2 font-medium">Trạng thái</th>
                    <th className="text-right px-4 py-2 font-medium">Đã gửi</th>
                    <th className="text-right px-4 py-2 font-medium">Open Rate</th>
                    <th className="text-right px-4 py-2 font-medium">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        Chưa có chiến dịch nào
                      </td>
                    </tr>
                  ) : (
                    data.recentCampaigns.map((c) => (
                      <tr key={c.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-2 font-medium">{c.name}</td>
                        <td className="px-4 py-2">
                          <Badge variant={STATUS_VARIANTS[c.status] ?? "secondary"}>
                            {STATUS_LABELS[c.status] ?? c.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">{c.sent.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{c.openRate}%</td>
                        <td className="px-4 py-2 text-right tabular-nums">{c.ctr}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

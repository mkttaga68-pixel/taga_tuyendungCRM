"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CartesianGrid,
  Line,
  LineChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  REPORT_GROUP_BY,
  REPORT_LEADERBOARD_TYPES,
  type ReportGroupBy,
  type ReportLeaderboardType,
} from "@taga-crm/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listLandingPages } from "@/lib/landing-pages-api";
import { getReportLeaderboard, getReportOverview, triggerReportRollup } from "@/lib/reports-api";
import { ApiError } from "@/lib/api-client";

const GROUP_BY_LABELS: Record<ReportGroupBy, string> = {
  day: "Ngày",
  week: "Tuần",
  month: "Tháng",
};

const LEADERBOARD_LABELS: Record<ReportLeaderboardType, string> = {
  "landing-page": "Landing Page",
  recruiter: "Recruiter",
  source: "Nguồn",
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(n);
}
function formatCurrency(n: number): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(n) + "đ";
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function OverviewTab() {
  const [dateFrom, setDateFrom] = useState(() => daysAgoIso(29));
  const [dateTo, setDateTo] = useState(() => todayIso());
  const [groupBy, setGroupBy] = useState<ReportGroupBy>("day");
  const [landingPageId, setLandingPageId] = useState<string>("__all__");
  const [leaderboardType, setLeaderboardType] = useState<ReportLeaderboardType>("landing-page");

  const landingPagesQuery = useQuery({ queryKey: ["landing-pages"], queryFn: listLandingPages });

  const overviewQuery = useQuery({
    queryKey: ["reports", "overview", dateFrom, dateTo, groupBy, landingPageId],
    queryFn: () =>
      getReportOverview({
        dateFrom,
        dateTo,
        groupBy,
        landingPageId: landingPageId === "__all__" ? undefined : landingPageId,
      }),
  });

  const leaderboardQuery = useQuery({
    queryKey: ["reports", "leaderboard", leaderboardType, dateFrom, dateTo],
    queryFn: () => getReportLeaderboard({ type: leaderboardType, dateFrom, dateTo, limit: 10 }),
  });

  const rollupMutation = useMutation({
    mutationFn: () => triggerReportRollup({}),
    onSuccess: () => toast.success("Đã đẩy job rollup hôm qua vào hàng đợi — vài giây sau số liệu GA4 sẽ cập nhật"),
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Không thể chạy rollup"),
  });

  const totals = overviewQuery.data?.totals;
  const series = overviewQuery.data?.series ?? [];

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Từ ngày</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Đến ngày</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nhóm theo</Label>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as ReportGroupBy)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_GROUP_BY.map((g) => (
                <SelectItem key={g} value={g}>
                  {GROUP_BY_LABELS[g]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Landing Page</Label>
          <Select value={landingPageId} onValueChange={setLandingPageId}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tất cả</SelectItem>
              {(landingPagesQuery.data ?? []).map((lp) => (
                <SelectItem key={lp.id} value={lp.id}>
                  {lp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => rollupMutation.mutate()} disabled={rollupMutation.isPending}>
          {rollupMutation.isPending ? "Đang chạy..." : "Chạy lại Rollup (hôm qua)"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard label="Form Submit" value={formatNumber(totals?.formSubmits ?? 0)} />
        <KpiCard label="Hires" value={formatNumber(totals?.hires ?? 0)} />
        <KpiCard label="Chi phí" value={formatCurrency(totals?.cost ?? 0)} />
        <KpiCard label="Cost / Form" value={formatCurrency(totals?.costPerForm ?? 0)} />
        <KpiCard label="Cost / Hire" value={formatCurrency(totals?.costPerHire ?? 0)} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard
          label="Visitors (GA4)"
          value={formatNumber(totals?.visitors ?? 0)}
          sub={overviewQuery.data && !overviewQuery.data.ga4Configured ? "GA4 chưa cấu hình" : undefined}
        />
        <KpiCard label="Sessions (GA4)" value={formatNumber(totals?.sessions ?? 0)} />
        <KpiCard label="Page Views (GA4)" value={formatNumber(totals?.pageViews ?? 0)} />
        <KpiCard label="Bounce Rate (GA4)" value={`${((totals?.bounceRate ?? 0) * 100).toFixed(1)}%`} />
        <KpiCard label="Avg Time (GA4)" value={`${Math.round(totals?.avgTimeSeconds ?? 0)}s`} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Form Submit &amp; Hires theo thời gian</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="formSubmits" name="Form Submit" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="hires" name="Hires" stroke="#22c55e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chi phí quảng cáo theo thời gian</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="cost" name="Chi phí" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Bảng xếp hạng</CardTitle>
          <Select value={leaderboardType} onValueChange={(v) => setLeaderboardType(v as ReportLeaderboardType)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_LEADERBOARD_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {LEADERBOARD_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{LEADERBOARD_LABELS[leaderboardType]}</TableHead>
                <TableHead className="text-right">
                  {leaderboardType === "landing-page" ? "Form Submit" : "Ứng viên mới"}
                </TableHead>
                <TableHead className="text-right">Hires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(leaderboardQuery.data?.items ?? []).map((row, index) => (
                <TableRow key={row.key}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>{row.label}</TableCell>
                  <TableCell className="text-right">{formatNumber(row.count)}</TableCell>
                  <TableCell className="text-right">{formatNumber(row.hires)}</TableCell>
                </TableRow>
              ))}
              {leaderboardQuery.data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Chưa có dữ liệu trong khoảng thời gian này
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

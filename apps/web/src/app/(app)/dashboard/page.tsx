"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-store";
import { ROLE_LABELS } from "@taga-crm/shared";

const ROADMAP_STATUS: { label: string; sprint: string; done: boolean }[] = [
  { label: "Auth/RBAC + Spreadsheet Engine (Ứng viên)", sprint: "Sprint 0–1", done: true },
  { label: "Sort/Filter/Group/Import/Export", sprint: "Sprint 2", done: true },
  { label: "Landing Page + Form Builder + Ingestion API", sprint: "Sprint 3", done: true },
  { label: "Pipeline (Next Step), CV, Lịch phỏng vấn", sprint: "Sprint 4", done: true },
  { label: "Automation Builder", sprint: "Sprint 5", done: true },
  { label: "Email/Telegram/Slack/Calendar/Pixel", sprint: "Sprint 6", done: true },
  { label: "Dashboard & Báo cáo realtime", sprint: "Sprint 7", done: true },
  { label: "Formula/Lookup/Rollup/Relation, Kanban view", sprint: "Sprint 8", done: true },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="h-full space-y-6 overflow-auto p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Chào {user?.fullName ?? ""}
        </h1>
        <p className="text-muted-foreground">
          Vai trò: {user ? ROLE_LABELS[user.role] : "—"}. Bảng{" "}
          <a href="/candidates" className="text-primary underline-offset-2 hover:underline">
            Ứng viên
          </a>{" "}
          đã dùng được — các module khác sẽ lên dần theo roadmap dưới đây.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tiến độ theo Roadmap</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ROADMAP_STATUS.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <span className="text-sm">{item.label}</span>
              <Badge variant={item.done ? "default" : "secondary"}>{item.sprint}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

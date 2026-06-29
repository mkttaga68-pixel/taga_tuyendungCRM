"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/stores/auth-store";
import { OverviewTab } from "./overview-tab";
import { AdSpendTab } from "./ad-spend-tab";

export default function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const canView = user?.role === "ADMIN" || user?.role === "HR_MANAGER";

  if (!canView) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Bạn không có quyền xem Báo cáo — chỉ Admin/HR Manager mới truy cập được.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-xl font-semibold">Báo cáo</h1>
        <span className="text-sm text-muted-foreground">
          Funnel tuyển dụng, chi phí quảng cáo và số liệu GA4
        </span>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="ad-spend">Chi phí Ads</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="ad-spend">
          <AdSpendTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

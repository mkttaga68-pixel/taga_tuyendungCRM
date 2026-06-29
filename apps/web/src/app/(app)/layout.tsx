import type { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AuthGuard } from "@/components/layout/auth-guard";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <SidebarProvider className="h-svh">
        <AppSidebar />
        <SidebarInset className="overflow-hidden">
          <Topbar />
          <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}

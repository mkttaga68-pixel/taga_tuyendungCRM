"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { getWorkflow } from "@/lib/automation-api";
import { AutomationCanvas } from "./automation-canvas";
import { RunHistoryTab } from "./run-history-tab";

export default function AutomationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useQuery({ queryKey: ["automation-workflows", id], queryFn: () => getWorkflow(id) });

  if (query.isLoading || !query.data) {
    return <div className="p-6 text-sm text-muted-foreground">Đang tải...</div>;
  }

  const workflow = query.data;

  return (
    <div className="h-full overflow-hidden p-6">
      <Link
        href="/automation"
        className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Automation
      </Link>
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{workflow.name}</h1>
        <Badge variant={workflow.isActive ? "default" : "secondary"}>
          {workflow.isActive ? "Đang bật" : "Đang tắt"}
        </Badge>
      </div>

      <Tabs defaultValue="canvas">
        <TabsList>
          <TabsTrigger value="canvas">Canvas</TabsTrigger>
          <TabsTrigger value="history">Lịch sử chạy</TabsTrigger>
        </TabsList>
        <TabsContent value="canvas">
          <AutomationCanvas workflowId={id} />
        </TabsContent>
        <TabsContent value="history">
          <RunHistoryTab workflowId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

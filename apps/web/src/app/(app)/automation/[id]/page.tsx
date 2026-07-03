"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { AUTOMATION_TRIGGER_TYPE_LABELS } from "@taga-crm/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getWorkflow, updateWorkflow } from "@/lib/automation-api";
import { listCustomTables } from "@/lib/custom-tables-api";
import { ApiError } from "@/lib/api-client";
import { AutomationCanvas } from "./automation-canvas";
import { RunHistoryTab } from "./run-history-tab";

const TABLE_TRIGGER_TYPES = new Set(["RECORD_CREATED", "FIELD_CHANGED"]);

export default function AutomationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["automation-workflows", id], queryFn: () => getWorkflow(id) });
  const tablesQuery = useQuery({ queryKey: ["custom-tables"], queryFn: listCustomTables, staleTime: 30_000 });
  const [triggerConfigOpen, setTriggerConfigOpen] = useState(false);
  const [selectedTableKey, setSelectedTableKey] = useState<string>("candidates");

  const updateTriggerMutation = useMutation({
    mutationFn: () =>
      updateWorkflow(id, { triggerConfig: { tableKey: selectedTableKey } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-workflows", id] });
      setTriggerConfigOpen(false);
      toast.success("Đã cập nhật cấu hình trigger");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Không thể cập nhật");
    },
  });

  if (query.isLoading || !query.data) {
    return <div className="p-6 text-sm text-muted-foreground">Đang tải...</div>;
  }

  const workflow = query.data;
  const triggerTableKey = (workflow.triggerConfig?.tableKey as string | undefined) ?? "candidates";
  const tables = tablesQuery.data ?? [];
  const triggerTableLabel =
    triggerTableKey === "candidates"
      ? "Ứng viên"
      : (tables.find((t) => t.tableKey === triggerTableKey)?.name ?? triggerTableKey);

  const showTableConfig = TABLE_TRIGGER_TYPES.has(workflow.triggerType);

  return (
    <div className="h-full overflow-hidden p-6">
      <Link
        href="/automation"
        className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Automation
      </Link>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{workflow.name}</h1>
        <Badge variant={workflow.isActive ? "default" : "secondary"}>
          {workflow.isActive ? "Đang bật" : "Đang tắt"}
        </Badge>
        <Badge variant="outline">{AUTOMATION_TRIGGER_TYPE_LABELS[workflow.triggerType]}</Badge>
        {showTableConfig && (
          <button
            type="button"
            className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
            onClick={() => {
              setSelectedTableKey(triggerTableKey);
              setTriggerConfigOpen(true);
            }}
          >
            <Settings2 className="size-3" />
            Bảng: {triggerTableLabel}
          </button>
        )}
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

      {/* Dialog chỉnh tableKey */}
      <Dialog open={triggerConfigOpen} onOpenChange={setTriggerConfigOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cấu hình bảng trigger</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Automation sẽ chạy khi có thay đổi trong bảng nào?</Label>
            <Select value={selectedTableKey} onValueChange={setSelectedTableKey}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="candidates">Ứng viên (mặc định)</SelectItem>
                {tables.map((t) => (
                  <SelectItem key={t.tableKey} value={t.tableKey}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button onClick={() => updateTriggerMutation.mutate()} disabled={updateTriggerMutation.isPending}>
              {updateTriggerMutation.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { use, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Pencil, Table2 } from "lucide-react";
import { toast } from "sonner";
import { AUTOMATION_TRIGGER_TYPE_LABELS } from "@taga-crm/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getWorkflow, updateWorkflow } from "@/lib/automation-api";
import { listCustomTables } from "@/lib/custom-tables-api";
import { getUiSettings } from "@/lib/settings-api";
import { ApiError } from "@/lib/api-client";
import { AutomationCanvas } from "./automation-canvas";
import { RunHistoryTab } from "./run-history-tab";

const TABLE_TRIGGER_TYPES = new Set(["RECORD_CREATED", "FIELD_CHANGED"]);

export default function AutomationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["automation-workflows", id], queryFn: () => getWorkflow(id) });
  const tablesQuery = useQuery({ queryKey: ["custom-tables"], queryFn: listCustomTables, staleTime: 30_000 });
  const uiSettingsQuery = useQuery({ queryKey: ["ui-settings"], queryFn: getUiSettings, staleTime: 60_000 });
  const candidatesTableName = uiSettingsQuery.data?.candidatesTableName ?? "Ứng viên";
  const [selectedTableKey, setSelectedTableKey] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const renameMutation = useMutation({
    mutationFn: (name: string) => updateWorkflow(id, { name }),
    onSuccess: (_, name) => {
      queryClient.invalidateQueries({ queryKey: ["automation-workflows", id] });
      queryClient.invalidateQueries({ queryKey: ["automation-workflows"] });
      toast.success(`Đã đổi tên thành "${name}"`);
      setIsEditingName(false);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Không thể đổi tên");
    },
  });

  function startEditName() {
    setEditedName(query.data?.name ?? "");
    setIsEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }

  function commitRename() {
    const trimmed = editedName.trim();
    if (!trimmed || trimmed === query.data?.name) {
      setIsEditingName(false);
      return;
    }
    renameMutation.mutate(trimmed);
  }

  const updateTriggerMutation = useMutation({
    mutationFn: (tableKey: string) =>
      updateWorkflow(id, { triggerConfig: { tableKey } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-workflows", id] });
      toast.success("Đã cập nhật bảng trigger");
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
      ? candidatesTableName
      : (tables.find((t) => t.tableKey === triggerTableKey)?.name ?? triggerTableKey);

  const showTableConfig = TABLE_TRIGGER_TYPES.has(workflow.triggerType);
  const activeTableKey = selectedTableKey ?? triggerTableKey;

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 border-b space-y-2 shrink-0">
        <Link
          href="/automation"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Automation
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {isEditingName ? (
            <Input
              ref={nameInputRef}
              className="h-8 w-72 text-xl font-semibold"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setIsEditingName(false);
              }}
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={startEditName}
              title="Nhấn để đổi tên"
              className="group flex items-center gap-1.5 rounded px-1 -mx-1 hover:bg-muted transition-colors"
            >
              <h1 className="text-xl font-semibold tracking-tight">{workflow.name}</h1>
              <Pencil className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
          <Badge variant={workflow.isActive ? "default" : "secondary"}>
            {workflow.isActive ? "Đang bật" : "Đang tắt"}
          </Badge>
          <Badge variant="outline">{AUTOMATION_TRIGGER_TYPE_LABELS[workflow.triggerType]}</Badge>
        </div>

        {/* Cấu hình bảng — hiển thị rõ khi trigger là RECORD_CREATED / FIELD_CHANGED */}
        {showTableConfig && (
          <div className="flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2">
            <Table2 className="size-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-1 items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">Bảng áp dụng:</span>
              <Select
                value={activeTableKey}
                onValueChange={(v) => {
                  setSelectedTableKey(v);
                  updateTriggerMutation.mutate(v);
                }}
              >
                <SelectTrigger className="h-7 w-52 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="candidates">{candidatesTableName} (mặc định)</SelectItem>
                  {tables.map((t) => (
                    <SelectItem key={t.tableKey} value={t.tableKey}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                Automation sẽ chạy khi có thay đổi trong bảng <strong>{triggerTableLabel}</strong>
              </span>
            </div>
            {updateTriggerMutation.isPending && (
              <span className="text-xs text-muted-foreground">Đang lưu...</span>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Tabs defaultValue="canvas" className="h-full flex flex-col">
          <TabsList className="mx-6 mt-3 shrink-0 w-fit">
            <TabsTrigger value="canvas">Canvas</TabsTrigger>
            <TabsTrigger value="history">Lịch sử chạy</TabsTrigger>
          </TabsList>
          <TabsContent value="canvas" className="flex-1 min-h-0 mt-2">
            <AutomationCanvas workflowId={id} />
          </TabsContent>
          <TabsContent value="history" className="flex-1 overflow-auto mt-2 px-6">
            <RunHistoryTab workflowId={id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

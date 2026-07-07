"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import {
  AUTOMATION_TRIGGER_TYPE_LABELS,
  AUTOMATION_TRIGGER_TYPES,
  AUTOMATION_RUN_STATUS_LABELS,
  createWorkflowSchema,
  type AutomationRunStatus,
  type CreateWorkflowInput,
} from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createWorkflow, deleteWorkflow, listWorkflows, updateWorkflow } from "@/lib/automation-api";
import { listCustomTables } from "@/lib/custom-tables-api";
import { getUiSettings } from "@/lib/settings-api";
import { ApiError } from "@/lib/api-client";

const RUN_STATUS_BADGE_VARIANT: Record<AutomationRunStatus, "default" | "secondary" | "destructive"> = {
  RUNNING: "secondary",
  SUCCESS: "default",
  FAILED: "destructive",
};

const TABLE_TRIGGER_TYPES = new Set(["RECORD_CREATED", "FIELD_CHANGED"]);

export default function AutomationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedTableKey, setSelectedTableKey] = useState("candidates");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameNameDraft, setRenameNameDraft] = useState("");

  const query = useQuery({ queryKey: ["automation-workflows"], queryFn: listWorkflows });
  const tablesQuery = useQuery({ queryKey: ["custom-tables"], queryFn: listCustomTables, staleTime: 30_000 });
  const uiSettingsQuery = useQuery({ queryKey: ["ui-settings"], queryFn: getUiSettings, staleTime: 60_000 });
  const candidatesTableName = uiSettingsQuery.data?.candidatesTableName ?? "Ứng viên";

  const form = useForm<CreateWorkflowInput>({
    resolver: zodResolver(createWorkflowSchema),
    defaultValues: { name: "", triggerType: "RECORD_CREATED" },
  });

  const watchedTrigger = form.watch("triggerType");

  const createMutation = useMutation({
    mutationFn: (values: CreateWorkflowInput) =>
      createWorkflow({
        ...values,
        triggerConfig: TABLE_TRIGGER_TYPES.has(values.triggerType)
          ? { tableKey: selectedTableKey }
          : {},
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["automation-workflows"] });
      setOpen(false);
      form.reset();
      setSelectedTableKey("candidates");
      toast.success(`Đã tạo workflow "${created.name}"`);
      router.push(`/automation/${created.id}`);
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể tạo workflow");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateWorkflow(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation-workflows"] }),
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể đổi trạng thái");
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateWorkflow(id, { name }),
    onSuccess: (_, { name }) => {
      queryClient.invalidateQueries({ queryKey: ["automation-workflows"] });
      toast.success(`Đã đổi tên thành "${name}"`);
      setRenameTarget(null);
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể đổi tên");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-workflows"] });
      toast.success("Đã xoá automation");
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể xoá automation");
    },
  });

  return (
    <div className="h-full space-y-6 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Automation</h1>
          <p className="text-muted-foreground">
            Tự động hoá quy trình tuyển dụng — tạo workflow, kéo-thả node, chạy nền qua BullMQ.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>+ Tạo Automation</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo Automation</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-3"
              onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
            >
              <div className="space-y-2">
                <Label htmlFor="wf-name">Tên</Label>
                <Input id="wf-name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Trigger</Label>
                <Select
                  value={form.watch("triggerType")}
                  onValueChange={(v) =>
                    form.setValue("triggerType", v as CreateWorkflowInput["triggerType"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTOMATION_TRIGGER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {AUTOMATION_TRIGGER_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {TABLE_TRIGGER_TYPES.has(watchedTrigger) && (
                <div className="space-y-2">
                  <Label>Bảng áp dụng</Label>
                  <Select value={selectedTableKey} onValueChange={setSelectedTableKey}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="candidates">{candidatesTableName} (mặc định)</SelectItem>
                      {(tablesQuery.data ?? []).map((t) => (
                        <SelectItem key={t.tableKey} value={t.tableKey}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Đang tạo..." : "Tạo"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Lần chạy gần nhất</TableHead>
              <TableHead>Bật/Tắt</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(query.data ?? []).map((wf) => (
              <TableRow key={wf.id}>
                <TableCell>
                  <Link href={`/automation/${wf.id}`} className="font-medium hover:underline">
                    {wf.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {AUTOMATION_TRIGGER_TYPE_LABELS[wf.triggerType]}
                </TableCell>
                <TableCell>
                  {wf.lastRunStatus ? (
                    wf.lastRunStatus === "FAILED" && wf.lastRunErrorMessage ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="destructive"
                              className="cursor-help underline decoration-dotted"
                            >
                              {AUTOMATION_RUN_STATUS_LABELS[wf.lastRunStatus]}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-sm whitespace-pre-wrap">
                            {wf.lastRunErrorMessage}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <Badge variant={RUN_STATUS_BADGE_VARIANT[wf.lastRunStatus]}>
                        {AUTOMATION_RUN_STATUS_LABELS[wf.lastRunStatus]}
                      </Badge>
                    )
                  ) : (
                    <span className="text-muted-foreground">Chưa chạy</span>
                  )}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={wf.isActive}
                    onCheckedChange={(checked) =>
                      toggleActiveMutation.mutate({ id: wf.id, isActive: checked })
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Đổi tên"
                      onClick={() => {
                        setRenameTarget({ id: wf.id, name: wf.name });
                        setRenameNameDraft(wf.name);
                      }}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      title="Xoá automation"
                      onClick={() => setDeleteTarget({ id: wf.id, name: wf.name })}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {query.data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Chưa có Automation nào.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!renameTarget} onOpenChange={(open) => { if (!open) setRenameTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi tên Automation</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="rename-input">Tên mới</Label>
            <Input
              id="rename-input"
              value={renameNameDraft}
              onChange={(e) => setRenameNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && renameNameDraft.trim() && renameTarget) {
                  renameMutation.mutate({ id: renameTarget.id, name: renameNameDraft.trim() });
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Huỷ
            </Button>
            <Button
              disabled={!renameNameDraft.trim() || renameMutation.isPending}
              onClick={() => {
                if (renameTarget && renameNameDraft.trim()) {
                  renameMutation.mutate({ id: renameTarget.id, name: renameNameDraft.trim() });
                }
              }}
            >
              {renameMutation.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá automation?</AlertDialogTitle>
            <AlertDialogDescription>
              Automation <span className="font-medium text-foreground">&ldquo;{deleteTarget?.name}&rdquo;</span> sẽ bị xoá vĩnh viễn cùng toàn bộ lịch sử chạy. Không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Đang xoá..." : "Xoá"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

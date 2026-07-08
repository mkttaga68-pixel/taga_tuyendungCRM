"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, Play, Pause, Trash2, ExternalLink } from "lucide-react";
import {
  listMktCampaigns,
  deleteMktCampaign,
  activateMktCampaign,
  pauseMktCampaign,
} from "@/lib/mkt-api";
import type { MktCampaignDto } from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

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

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<MktCampaignDto | null>(null);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["mkt-campaigns"],
    queryFn: listMktCampaigns,
  });

  const activateMutation = useMutation({
    mutationFn: activateMktCampaign,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mkt-campaigns"] });
      toast.success("Chiến dịch đã kích hoạt");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pauseMutation = useMutation({
    mutationFn: pauseMktCampaign,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mkt-campaigns"] });
      toast.success("Đã tạm dừng chiến dịch");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMktCampaign,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mkt-campaigns"] });
      setDeleteTarget(null);
      toast.success("Đã xóa chiến dịch");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <TooltipProvider>
      <div className="h-full overflow-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Chiến dịch Email</h1>
            <p className="text-sm text-muted-foreground">Quản lý chuỗi email marketing tự động</p>
          </div>
          <Button asChild>
            <Link href="/marketing/campaigns/new">
              <Plus className="mr-2 h-4 w-4" /> Tạo chiến dịch
            </Link>
          </Button>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên chiến dịch</TableHead>
                <TableHead>Người gửi</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Emails</TableHead>
                <TableHead className="text-right">Đăng ký</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <div className="h-4 rounded bg-muted animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <p className="text-muted-foreground">Chưa có chiến dịch nào.</p>
                    <Button asChild className="mt-3" size="sm">
                      <Link href="/marketing/campaigns/new">Tạo chiến dịch đầu tiên</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((c) => {
                  const canActivate =
                    (c.status === "DRAFT" || c.status === "PAUSED") && c.emailCount > 0;
                  const needsEmail =
                    (c.status === "DRAFT" || c.status === "PAUSED") && c.emailCount === 0;

                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{c.name}</p>
                          {c.description && (
                            <p className="text-xs text-muted-foreground">{c.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{c.fromName}</p>
                          <p className="text-muted-foreground text-xs">{c.fromEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[c.status] ?? "secondary"}>
                          {STATUS_LABELS[c.status] ?? c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{c.emailCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.enrollmentCount}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {canActivate && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              title="Kích hoạt"
                              onClick={() => activateMutation.mutate(c.id)}
                              disabled={activateMutation.isPending}
                            >
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {needsEmail && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex h-7 w-7 items-center justify-center">
                                  <Play className="h-3.5 w-3.5 text-muted-foreground/40" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Thêm ít nhất 1 email trước khi kích hoạt
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {c.status === "ACTIVE" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              title="Tạm dừng"
                              onClick={() => pauseMutation.mutate(c.id)}
                              disabled={pauseMutation.isPending}
                            >
                              <Pause className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                            <Link href={`/marketing/campaigns/${c.id}`}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(c)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xóa chiến dịch?</AlertDialogTitle>
              <AlertDialogDescription>
                Chiến dịch &quot;{deleteTarget?.name}&quot; và toàn bộ sequence email sẽ bị xóa.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              >
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

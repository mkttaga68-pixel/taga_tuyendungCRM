"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  EMAIL_STATUS_LABELS,
  type EmailLogDto,
  type EmailStatus,
} from "@taga-crm/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listEmailLogs } from "@/lib/email-logs-api";

const STATUS_BADGE: Record<EmailStatus, "default" | "secondary" | "destructive"> = {
  QUEUED: "secondary",
  SENT: "default",
  FAILED: "destructive",
  BOUNCED: "destructive",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function SentEmailsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<EmailLogDto | null>(null);

  const query = useQuery({
    queryKey: ["email-logs", "sent", search, page],
    queryFn: () => listEmailLogs({ direction: "OUTBOUND", search: search || undefined, page, limit: 20 }),
    placeholderData: (prev) => prev,
  });

  const data = query.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="h-full space-y-4 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Thư đã gửi</h1>
          <p className="text-muted-foreground">Lịch sử toàn bộ email đã gửi đi từ hệ thống.</p>
        </div>
        <Button asChild>
          <Link href="/emails/compose">+ Soạn thư mới</Link>
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Tìm theo tiêu đề, địa chỉ email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tiêu đề</TableHead>
              <TableHead>Gửi tới</TableHead>
              <TableHead>Ứng viên</TableHead>
              <TableHead>Người gửi</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.data ?? []).map((log) => (
              <TableRow
                key={log.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setPreview(log)}
              >
                <TableCell className="max-w-xs truncate font-medium">{log.subject}</TableCell>
                <TableCell className="text-muted-foreground">{log.toEmail}</TableCell>
                <TableCell>
                  {log.candidateId && log.candidateName ? (
                    <Link
                      href={`/candidates?highlight=${log.candidateId}`}
                      className="text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {log.candidateName}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {log.sentByName ?? "Automation"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(log.createdAt)}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE[log.status]}>
                    {EMAIL_STATUS_LABELS[log.status]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Chưa có email nào được gửi.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page} / {totalPages} ({data?.total ?? 0} email)
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </Button>
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(open) => { if (!open) setPreview(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="truncate">{preview?.subject}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground space-y-1">
                <div><span className="font-medium text-foreground">Từ:</span> {preview.fromEmail ?? "—"}</div>
                <div><span className="font-medium text-foreground">Tới:</span> {preview.toEmail}</div>
                <div><span className="font-medium text-foreground">Thời gian:</span> {formatDate(preview.createdAt)}</div>
                {preview.errorMessage && (
                  <div className="text-destructive"><span className="font-medium">Lỗi:</span> {preview.errorMessage}</div>
                )}
              </div>
              <div className="border rounded-md overflow-hidden max-h-[60vh] overflow-y-auto">
                <iframe
                  srcDoc={preview.bodyHtml}
                  className="w-full min-h-[300px]"
                  title="Nội dung email"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

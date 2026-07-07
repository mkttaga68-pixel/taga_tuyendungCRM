"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import type { EmailLogDto } from "@taga-crm/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { listEmailLogs, markEmailAsRead } from "@/lib/email-logs-api";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function InboxPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<EmailLogDto | null>(null);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["email-logs", "inbox", search, page],
    queryFn: () => listEmailLogs({ direction: "INBOUND", search: search || undefined, page, limit: 20 }),
    placeholderData: (prev) => prev,
  });

  const markReadMutation = useMutation({
    mutationFn: markEmailAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-logs"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-unread-count"] });
    },
  });

  const data = query.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="h-full space-y-4 overflow-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hộp thư đến</h1>
          <p className="text-muted-foreground">Email phản hồi từ ứng viên gửi vào địa chỉ inbound của hệ thống.</p>
        </div>
        <Button asChild>
          <Link href="/emails/compose">+ Soạn thư mới</Link>
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Cấu hình nhận email</AlertTitle>
        <AlertDescription>
          Để nhận được phản hồi từ ứng viên, cần cấu hình <strong>Resend Inbound</strong>: vào Resend Dashboard → Domains → chọn domain → Inbound, trỏ MX record về <code>inbound.resend.com</code> và đặt webhook URL là <code>[API_URL]/email-logs/inbound</code>.
        </AlertDescription>
      </Alert>

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
              <TableHead>Từ</TableHead>
              <TableHead>Ứng viên</TableHead>
              <TableHead>Thời gian nhận</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.data ?? []).map((log) => {
              const unread = !log.isRead;
              return (
                <TableRow
                  key={log.id}
                  className={`cursor-pointer hover:bg-muted/50 ${unread ? "bg-blue-50/40 dark:bg-blue-950/20" : ""}`}
                  onClick={() => {
                    setPreview(log);
                    if (unread) markReadMutation.mutate(log.id);
                  }}
                >
                  <TableCell className={`max-w-xs truncate ${unread ? "font-semibold text-foreground" : "font-normal text-muted-foreground"}`}>
                    {unread && <span className="mr-2 inline-block size-2 rounded-full bg-blue-500 align-middle" />}
                    {log.subject}
                  </TableCell>
                  <TableCell className={unread ? "font-medium text-foreground" : "text-muted-foreground"}>
                    {log.fromEmail ?? "—"}
                  </TableCell>
                  <TableCell>
                    {log.candidateId && log.candidateName ? (
                      <Badge variant="outline">{log.candidateName}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className={`text-sm ${unread ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                    {formatDate(log.createdAt)}
                  </TableCell>
                </TableRow>
              );
            })}
            {data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Chưa có email nào. Hộp thư sẽ hiển thị email ứng viên phản hồi sau khi cấu hình Resend Inbound.
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
                {preview.candidateName && (
                  <div>
                    <span className="font-medium text-foreground">Ứng viên:</span>{" "}
                    <Link
                      href={`/candidates?highlight=${preview.candidateId}`}
                      className="text-primary hover:underline"
                    >
                      {preview.candidateName}
                    </Link>
                  </div>
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
              <div className="flex justify-end">
                <Button asChild size="sm">
                  <Link href={`/emails/compose?replyTo=${encodeURIComponent(preview.fromEmail ?? "")}&subject=${encodeURIComponent(`Re: ${preview.subject}`)}&candidateId=${preview.candidateId ?? ""}`}>
                    Trả lời
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

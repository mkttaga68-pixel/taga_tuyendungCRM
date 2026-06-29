"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { downloadCvAttachment, listCvAttachments, uploadCvAttachment } from "@/lib/cv-attachments-api";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError } from "@/lib/api-client";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CvTab({ candidateId }: { candidateId: string }) {
  const user = useAuthStore((s) => s.user);
  const canUpload = user?.role !== "VIEWER";
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["candidates", candidateId, "cv-attachments"],
    queryFn: () => listCvAttachments(candidateId),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadCvAttachment(candidateId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates", candidateId, "cv-attachments"] });
      toast.success("Đã tải lên CV");
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể tải lên CV");
    },
  });

  async function handleDownload(attachment: NonNullable<typeof query.data>[number]) {
    setDownloadingId(attachment.id);
    try {
      await downloadCvAttachment(attachment);
    } catch {
      toast.error("Không tải được file CV");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="space-y-3 pt-4">
      {canUpload && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMutation.mutate(file);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            <Upload className="size-4" />
            {uploadMutation.isPending ? "Đang tải lên..." : "Tải lên CV mới"}
          </Button>
        </div>
      )}

      {(query.data ?? []).map((cv) => (
        <div key={cv.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{cv.fileName}</div>
              <div className="text-xs text-muted-foreground">
                v{cv.version} · {formatSize(cv.sizeBytes)} · {cv.uploadedBy?.fullName ?? "—"} ·{" "}
                {new Date(cv.uploadedAt).toLocaleDateString("vi-VN")}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {cv.isCurrent && <Badge variant="default">Hiện tại</Badge>}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDownload(cv)}
              disabled={downloadingId === cv.id}
            >
              <Download className="size-4" />
            </Button>
          </div>
        </div>
      ))}
      {query.data?.length === 0 && !query.isLoading && (
        <p className="text-sm text-muted-foreground">Chưa có CV nào.</p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createComment, deleteComment, listComments } from "@/lib/comments-api";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError } from "@/lib/api-client";

export function CommentsTab({ candidateId }: { candidateId: string }) {
  const user = useAuthStore((s) => s.user);
  const canDeleteOthers = user?.role === "ADMIN" || user?.role === "HR_MANAGER";
  const queryClient = useQueryClient();
  const [bodyText, setBodyText] = useState("");

  const query = useQuery({
    queryKey: ["comments", "candidates", candidateId],
    queryFn: () => listComments("candidates", candidateId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["comments", "candidates", candidateId] });

  const createMutation = useMutation({
    mutationFn: () => createComment({ entityTable: "candidates", entityId: candidateId, bodyText }),
    onSuccess: () => {
      setBodyText("");
      invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể gửi comment");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: invalidate,
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể xoá comment");
    },
  });

  return (
    <div className="space-y-3 pt-4">
      {(query.data ?? []).map((comment) => (
        <div key={comment.id} className="rounded-md border p-3 text-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium">{comment.author?.fullName ?? "—"}</span>{" "}
              <span className="text-xs text-muted-foreground">
                {new Date(comment.createdAt).toLocaleString("vi-VN")}
              </span>
            </div>
            {(comment.author?.id === user?.id || canDeleteOthers) && (
              <Button
                size="icon"
                variant="ghost"
                className="size-6"
                onClick={() => deleteMutation.mutate(comment.id)}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            )}
          </div>
          <p className="mt-1 whitespace-pre-wrap">{comment.bodyText}</p>
        </div>
      ))}
      {query.data?.length === 0 && !query.isLoading && (
        <p className="text-sm text-muted-foreground">Chưa có comment nào.</p>
      )}

      <div className="space-y-2">
        <Textarea
          placeholder="Viết comment..."
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          rows={3}
        />
        <Button
          size="sm"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || !bodyText.trim()}
        >
          {createMutation.isPending ? "Đang gửi..." : "Gửi comment"}
        </Button>
      </div>
    </div>
  );
}

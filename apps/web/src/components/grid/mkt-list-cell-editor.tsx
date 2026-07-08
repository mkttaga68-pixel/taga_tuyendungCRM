"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { toast } from "sonner";
import type { CandidateDto } from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { syncCandidateMktLists } from "@/lib/candidates-api";
import { ApiError } from "@/lib/api-client";
import { patchCandidateInCache } from "./candidates-cache.util";

export function MktListCellEditor({
  candidate,
  allMktLists,
  isOpen,
  onClose,
  children,
}: {
  candidate: CandidateDto;
  allMktLists: { id: string; name: string }[];
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const selectedIds = new Set(candidate.mktContactLists.map((l) => l.id));

  const mutation = useMutation({
    mutationFn: (listIds: string[]) => syncCandidateMktLists(candidate.id, listIds),
    onSuccess: (updated) => {
      patchCandidateInCache(queryClient, updated);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Không thể cập nhật danh bạ"),
  });

  function toggle(listId: string) {
    const next = new Set(selectedIds);
    if (next.has(listId)) {
      next.delete(listId);
    } else {
      next.add(listId);
    }
    mutation.mutate(Array.from(next));
  }

  return (
    <Popover open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2" onMouseDown={(e) => e.stopPropagation()}>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Chọn danh bạ</p>
        {allMktLists.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">Chưa có danh bạ nào.</p>
        ) : (
          <div className="max-h-56 space-y-0.5 overflow-y-auto">
            {allMktLists.map((list) => {
              const checked = selectedIds.has(list.id);
              return (
                <button
                  key={list.id}
                  type="button"
                  disabled={mutation.isPending}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                  onClick={() => toggle(list.id)}
                >
                  <div
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                    style={checked ? { backgroundColor: "#6366f1", borderColor: "#6366f1" } : undefined}
                  >
                    {checked && <Check className="size-3 text-white" />}
                  </div>
                  <span className="truncate">{list.name}</span>
                </button>
              );
            })}
          </div>
        )}
        <Button size="sm" variant="outline" className="mt-2 w-full" onClick={onClose}>
          Đóng
        </Button>
      </PopoverContent>
    </Popover>
  );
}

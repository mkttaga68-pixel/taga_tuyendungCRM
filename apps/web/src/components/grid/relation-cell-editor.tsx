"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { CandidateDto, FieldDefinitionDto } from "@taga-crm/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addCandidateRelation, listCandidates, removeCandidateRelation } from "@/lib/candidates-api";
import { ApiError } from "@/lib/api-client";
import { getCellValue } from "./candidate-field-value";
import { CANDIDATES_QUERY_PREFIX } from "./candidates-cache.util";

interface RelationItem {
  id: string;
  label: string;
}

export function RelationCellEditor({
  candidate,
  field,
  isOpen,
  onClose,
  children,
}: {
  candidate: CandidateDto;
  field: FieldDefinitionDto;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const currentLinks = (getCellValue(candidate, field) as RelationItem[] | undefined) ?? [];
  const linkedIds = new Set(currentLinks.map((l) => l.id));

  const searchQuery = useQuery({
    queryKey: ["candidates", "relation-picker", search],
    queryFn: () => listCandidates({ search, limit: 8 }),
    enabled: isOpen && search.trim().length > 0,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: CANDIDATES_QUERY_PREFIX, exact: false });
  }

  const addMutation = useMutation({
    mutationFn: (toRecordId: string) => addCandidateRelation(candidate.id, field.fieldKey, toRecordId),
    onSuccess: () => {
      invalidate();
      setSearch("");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Không thể liên kết"),
  });
  const removeMutation = useMutation({
    mutationFn: (toRecordId: string) => removeCandidateRelation(candidate.id, field.fieldKey, toRecordId),
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Không thể bỏ liên kết"),
  });

  return (
    <Popover open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap gap-1">
          {currentLinks.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-2 py-0.5 text-xs text-sky-700"
            >
              {item.label}
              <button type="button" onClick={() => removeMutation.mutate(item.id)}>
                <X className="size-3" />
              </button>
            </span>
          ))}
          {currentLinks.length === 0 && (
            <p className="text-xs text-muted-foreground">Chưa liên kết ứng viên nào.</p>
          )}
        </div>
        <Input
          autoFocus
          placeholder="Tìm ứng viên để liên kết..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {(searchQuery.data?.items ?? [])
            .filter((c) => c.id !== candidate.id && !linkedIds.has(c.id))
            .map((c) => (
              <button
                key={c.id}
                type="button"
                className="block w-full rounded-md border px-2 py-1 text-left text-sm hover:bg-muted"
                onClick={() => addMutation.mutate(c.id)}
              >
                {c.fullName} {c.phone && <span className="text-muted-foreground">· {c.phone}</span>}
              </button>
            ))}
          {search.trim() && searchQuery.data?.items.length === 0 && (
            <p className="px-2 py-1 text-xs text-muted-foreground">Không tìm thấy.</p>
          )}
        </div>
        <Button size="sm" variant="outline" className="w-full" onClick={onClose}>
          Đóng
        </Button>
      </PopoverContent>
    </Popover>
  );
}

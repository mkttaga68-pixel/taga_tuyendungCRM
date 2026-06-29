"use client";

import { useMemo } from "react";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CandidateDto, FilterCondition, SortCondition } from "@taga-crm/shared";
import { listCandidates, updateCandidateFields } from "@/lib/candidates-api";
import type { PipelineStageDto } from "@/lib/pipeline-stages-api";
import { ApiError } from "@/lib/api-client";

/**
 * Kanban là view PHỤ (không mặc định, không virtualized) — tải tối đa
 * KANBAN_ROW_LIMIT ứng viên khớp filter hiện tại rồi nhóm theo statusId ở
 * client. Đủ dùng cho board quản lý hằng ngày; danh sách triệu bản ghi vẫn
 * dùng Grid (có virtualization + phân trang) làm view chính. Giá trị này
 * bằng đúng mức limit tối đa mà candidateQueryParamsSchema cho phép (200).
 */
const KANBAN_ROW_LIMIT = 200;

interface KanbanBoardProps {
  search: string;
  filters: FilterCondition[];
  sorts: SortCondition[];
  pipelineStages: PipelineStageDto[];
  onOpenCandidate: (id: string) => void;
}

function KanbanCard({ candidate }: { candidate: CandidateDto }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: candidate.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="cursor-grab space-y-1 rounded-md border bg-background p-2 text-sm shadow-sm active:cursor-grabbing"
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      <p className="font-medium">{candidate.fullName}</p>
      {candidate.phone && <p className="text-xs text-muted-foreground">{candidate.phone}</p>}
      {candidate.recruiter && (
        <p className="text-xs text-muted-foreground">Recruiter: {candidate.recruiter.fullName}</p>
      )}
      {candidate.nextActionNote && (
        <p className="truncate text-xs text-muted-foreground">{candidate.nextActionNote}</p>
      )}
    </div>
  );
}

function KanbanColumn({
  stage,
  candidates,
  onOpenCandidate,
}: {
  stage: PipelineStageDto;
  candidates: CandidateDto[];
  onOpenCandidate: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-md border ${isOver ? "bg-primary/5" : "bg-muted/20"}`}
    >
      <div
        className="flex items-center justify-between rounded-t-md px-3 py-2 text-sm font-medium"
        style={{ backgroundColor: `${stage.color}26`, color: stage.color }}
      >
        <span>{stage.label}</span>
        <span className="text-xs">{candidates.length}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {candidates.map((c) => (
          <div key={c.id} onDoubleClick={() => onOpenCandidate(c.id)}>
            <KanbanCard candidate={c} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard({ search, filters, sorts, pipelineStages, onOpenCandidate }: KanbanBoardProps) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["candidates", "kanban", search, filters, sorts],
    queryFn: () => listCandidates({ search, filters, sorts, limit: KANBAN_ROW_LIMIT }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, statusId }: { id: string; statusId: string }) =>
      updateCandidateFields(id, { statusId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["candidates", "kanban"] }),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Không đổi được trạng thái"),
  });

  const candidatesByStage = useMemo(() => {
    const map = new Map<string, CandidateDto[]>();
    for (const stage of pipelineStages) map.set(stage.id, []);
    for (const candidate of query.data?.items ?? []) {
      const arr = map.get(candidate.status.id);
      if (arr) arr.push(candidate);
    }
    return map;
  }, [query.data, pipelineStages]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const candidateId = String(active.id);
    const newStageId = String(over.id);
    const candidate = (query.data?.items ?? []).find((c) => c.id === candidateId);
    if (!candidate || candidate.status.id === newStageId) return;
    updateMutation.mutate({ id: candidateId, statusId: newStageId });
  }

  if (query.isLoading) {
    return <div className="flex-1 p-6 text-sm text-muted-foreground">Đang tải Kanban...</div>;
  }

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden p-3">
      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex h-full gap-3">
          {pipelineStages
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                candidates={candidatesByStage.get(stage.id) ?? []}
                onOpenCandidate={onOpenCandidate}
              />
            ))}
        </div>
      </DndContext>
    </div>
  );
}

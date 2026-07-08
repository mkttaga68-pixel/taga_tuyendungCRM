"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  type InfiniteData,
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useSearchParams } from "next/navigation";
import { Maximize2 } from "lucide-react";
import { toast } from "sonner";
import {
  CREATABLE_CUSTOM_FIELD_TYPES,
  type CandidateDto,
  type CandidateListQuery,
  type ColorRule,
  type FieldDefinitionDto,
  type FilterCondition,
  type SortCondition,
  type ViewDto,
  type ViewTypeValue,
} from "@taga-crm/shared";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApiError } from "@/lib/api-client";
import {
  bulkDeleteCandidates,
  bulkUpdateRecruiter,
  bulkUpdateStatus,
  createCandidate,
  listCandidates,
  updateCandidateFields,
} from "@/lib/candidates-api";
import {
  createFieldDefinition,
  deleteFieldDefinition,
  listFieldDefinitions,
  reorderFieldDefinitions,
  updateFieldDefinition,
} from "@/lib/field-definitions-api";
import { listPipelineStages } from "@/lib/pipeline-stages-api";
import { lookupUsers } from "@/lib/users-lookup-api";
import { listMktContactLists } from "@/lib/mkt-api";
import { createView, deleteView, listViews, setDefaultView, updateView } from "@/lib/views-api";
import { downloadCandidatesExport, importCandidatesFile } from "@/lib/import-export-api";
import { useAuthStore } from "@/stores/auth-store";
import { getSelectionRange, isCellInRange, useGridStore } from "@/stores/grid-store";
import { GridToolbar } from "./grid-toolbar";
import { GridHeaderRow } from "./grid-header-row";
import { GridCell } from "./grid-cell";
import { GridGroupHeaderRow, GROUP_HEADER_HEIGHT } from "./grid-group-header";
import { ViewTabs } from "./view-tabs";
import { AddRecordRow } from "./add-record-row";
import { KanbanBoard } from "./kanban-board";
import { CHECKBOX_COL_WIDTH, ROW_HEIGHT, ROW_NUMBER_COL_WIDTH } from "./grid-constants";
import { getCellValue, getGroupLabel, getPreviousRawValue, isFieldEditable } from "./candidate-field-value";
import { cellValueToText, rowsToTsv, tsvToRows } from "@/lib/grid-clipboard.util";
import { coerceForPaste } from "./grid-paste.util";
import { resolveRowColor } from "./color-rules.util";
import { isFilterConditionComplete } from "./filter-condition.util";
import {
  buildCandidatesQueryKey,
  CANDIDATES_QUERY_PREFIX,
  patchCandidateInCache,
  prependCandidateInCache,
  removeCandidatesFromCache,
} from "./candidates-cache.util";
import { CandidateDrawer } from "@/components/candidate-drawer/candidate-drawer";
import { AddFieldDialog } from "./add-field-dialog";

const FIELD_DEFS_QUERY_KEY = ["field-definitions", "candidates"] as const;
const VIEWS_QUERY_KEY = ["views", "candidates"] as const;
const TABLE_KEY = "candidates";
const VIEW_SAVE_DEBOUNCE_MS = 800;

type CandidatesInfiniteData = InfiniteData<import("@taga-crm/shared").CandidateListResponse>;

function buildOptimisticPatch(
  candidate: import("@taga-crm/shared").CandidateDto,
  fieldUpdates: Record<string, unknown>,
  pipelineStages: import("@/lib/pipeline-stages-api").PipelineStageDto[],
  users: import("@/lib/users-lookup-api").UserLookupDto[],
  fieldDefs: import("@taga-crm/shared").FieldDefinitionDto[],
): import("@taga-crm/shared").CandidateDto {
  let updated = { ...candidate };
  for (const [fieldKey, value] of Object.entries(fieldUpdates)) {
    if (fieldKey === "statusId") {
      const stage = pipelineStages.find((s) => s.id === value);
      if (stage) updated = { ...updated, status: { id: stage.id, key: stage.key, label: stage.label, color: stage.color } };
    } else if (fieldKey === "recruiterId") {
      updated = { ...updated, recruiter: value === null ? null : (() => { const u = users.find((u) => u.id === value); return u ? { id: u.id, fullName: u.fullName } : updated.recruiter; })() };
    } else {
      const def = fieldDefs.find((f) => f.fieldKey === fieldKey);
      if (def && !def.isSystem) {
        updated = { ...updated, customFields: { ...updated.customFields, [fieldKey]: value } };
      } else {
        updated = { ...updated, [fieldKey]: value } as typeof updated;
      }
    }
  }
  return updated;
}

interface DisplayRow {
  kind: "group" | "row";
  rowIndex: number;
  candidate?: CandidateDto;
  label?: string;
  count?: number;
}

export function CandidatesGrid() {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const addRecordInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingInsertRef = useRef<{ fieldId: string; side: "left" | "right" } | null>(null);
  const [addColumnOpen, setAddColumnOpen] = useState(false);
  const [insertCtx, setInsertCtx] = useState<{ fieldId: string; side: "left" | "right" } | null>(null);
  const currentUser = useAuthStore((s) => s.user);
  const canManageShared = currentUser?.role === "ADMIN" || currentUser?.role === "HR_MANAGER";

  const fieldsQuery = useQuery({
    queryKey: FIELD_DEFS_QUERY_KEY,
    queryFn: () => listFieldDefinitions(TABLE_KEY),
  });
  const pipelineStagesQuery = useQuery({ queryKey: ["pipeline-stages"], queryFn: listPipelineStages });
  const usersQuery = useQuery({ queryKey: ["users-lookup"], queryFn: lookupUsers });
  const viewsQuery = useQuery({ queryKey: VIEWS_QUERY_KEY, queryFn: () => listViews(TABLE_KEY) });
  const mktListsQuery = useQuery({ queryKey: ["mkt-contact-lists"], queryFn: listMktContactLists });

  const fields = useMemo(() => fieldsQuery.data ?? [], [fieldsQuery.data]);
  const visibleFields = useMemo(() => fields.filter((f) => !f.isHidden), [fields]);
  const hiddenFields = useMemo(() => fields.filter((f) => f.isHidden), [fields]);
  const pipelineStages = pipelineStagesQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const allMktLists = useMemo(() => mktListsQuery.data ?? [], [mktListsQuery.data]);
  const views = useMemo(() => viewsQuery.data ?? [], [viewsQuery.data]);
  const fieldsByKey = useMemo(() => new Map(fields.map((f) => [f.fieldKey, f])), [fields]);

  const searchParams = useSearchParams();
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [drawerCandidateId, setDrawerCandidateId] = useState<string | null>(
    () => searchParams.get("candidateId"),
  );
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [sorts, setSorts] = useState<SortCondition[]>([]);
  const [groupBy, setGroupBy] = useState<string | null>(null);
  const [colorRules, setColorRules] = useState<ColorRule[]>([]);

  const activeView = views.find((v) => v.id === activeViewId) ?? null;

  function applyView(view: ViewDto) {
    setActiveViewId(view.id);
    setSearch("");
    setFilters(view.filters);
    setSorts(view.sorts);
    setGroupBy(view.groupBy);
    setColorRules(view.colorRules);
  }

  useEffect(() => {
    if (activeViewId !== null || views.length === 0) return;
    const def = views.find((v) => v.isDefault) ?? views[0];
    if (def) applyView(def);
  }, [views, activeViewId]);

  function canMutateView(view: ViewDto | null): boolean {
    if (!view) return false;
    if (view.ownerId === null) return canManageShared;
    return view.ownerId === currentUser?.id;
  }

  const updateViewMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateView>[1] }) =>
      updateView(id, input),
    onSuccess: (updated) =>
      queryClient.setQueryData<ViewDto[]>(VIEWS_QUERY_KEY, (old = []) =>
        old.map((v) => (v.id === updated.id ? updated : v)),
      ),
  });

  function scheduleViewSave(patch: Parameters<typeof updateView>[1]) {
    if (!canMutateView(activeView) || !activeView) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const viewId = activeView.id;
    saveTimerRef.current = setTimeout(() => {
      updateViewMutation.mutate({ id: viewId, input: patch });
    }, VIEW_SAVE_DEBOUNCE_MS);
  }

  function handleFiltersChange(next: FilterCondition[]) {
    setFilters(next);
    scheduleViewSave({ filters: next });
  }
  function handleSortsChange(next: SortCondition[]) {
    setSorts(next);
    scheduleViewSave({ sorts: next });
  }
  function handleGroupByChange(next: string | null) {
    setGroupBy(next);
    scheduleViewSave({ groupBy: next });
  }
  function handleColorRulesChange(next: ColorRule[]) {
    setColorRules(next);
    scheduleViewSave({ colorRules: next });
  }

  const createViewMutation = useMutation({
    mutationFn: ({ name, type }: { name: string; type: ViewTypeValue }) =>
      createView(
        TABLE_KEY,
        type === "KANBAN" ? { name, type, filters, sorts } : { name, type, filters, sorts, groupBy, colorRules },
      ),
    onSuccess: (created) => {
      queryClient.setQueryData<ViewDto[]>(VIEWS_QUERY_KEY, (old = []) => [...old, created]);
      applyView(created);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Không tạo được chế độ xem"),
  });

  const renameViewMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateView(id, { name }),
    onSuccess: (updated) =>
      queryClient.setQueryData<ViewDto[]>(VIEWS_QUERY_KEY, (old = []) =>
        old.map((v) => (v.id === updated.id ? updated : v)),
      ),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Không đổi tên được"),
  });

  const deleteViewMutation = useMutation({
    mutationFn: (id: string) => deleteView(id),
    onSuccess: (_data, id) => {
      const remaining = views.filter((v) => v.id !== id);
      queryClient.setQueryData<ViewDto[]>(VIEWS_QUERY_KEY, remaining);
      if (activeViewId === id) {
        const fallback = remaining.find((v) => v.isDefault) ?? remaining[0];
        if (fallback) applyView(fallback);
      }
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Không xoá được chế độ xem"),
  });

  const setDefaultViewMutation = useMutation({
    mutationFn: (id: string) => setDefaultView(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: VIEWS_QUERY_KEY }),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Không đổi được view mặc định"),
  });

  const completeFilters = useMemo(() => filters.filter(isFilterConditionComplete), [filters]);
  const queryParams = useMemo<CandidateListQuery>(
    () => ({ search, filters: completeFilters, sorts, groupBy }),
    [search, completeFilters, sorts, groupBy],
  );
  const candidatesQueryKey = useMemo(() => buildCandidatesQueryKey(queryParams), [queryParams]);

  const candidatesQuery = useInfiniteQuery({
    queryKey: candidatesQueryKey,
    queryFn: ({ pageParam }) => listCandidates({ ...queryParams, offset: pageParam, limit: 100 }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.flatMap((p) => p.items).length : undefined,
    enabled: activeViewId !== null,
    // Đổi filter/sort/search/group đổi queryKey — giữ data cũ hiển thị trong lúc
    // fetch data mới, tránh unmount toàn bộ Grid (kể cả Toolbar) mỗi lần đổi.
    placeholderData: keepPreviousData,
    // Poll mỗi 30s để cột "Email gần nhất" cập nhật real-time sau khi automation gửi mail.
    refetchInterval: 30_000,
  });

  const candidates = useMemo(
    () => candidatesQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [candidatesQuery.data],
  );

  const groupByField = groupBy ? (fieldsByKey.get(groupBy) ?? null) : null;

  const displayRows = useMemo<DisplayRow[]>(() => {
    if (!groupByField) {
      return candidates.map((c, i) => ({ kind: "row", rowIndex: i, candidate: c }));
    }
    const rows: DisplayRow[] = [];
    let lastLabel: string | null = null;
    let groupStartIndex = -1;
    candidates.forEach((c, i) => {
      const label = getGroupLabel(c, groupByField);
      if (label !== lastLabel) {
        rows.push({ kind: "group", rowIndex: -1, label, count: 0 });
        lastLabel = label;
        groupStartIndex = rows.length - 1;
      }
      rows.push({ kind: "row", rowIndex: i, candidate: c });
      const groupRow = rows[groupStartIndex];
      if (groupRow) groupRow.count = (groupRow.count ?? 0) + 1;
    });
    return rows;
  }, [candidates, groupByField]);

  const activeCell = useGridStore((s) => s.activeCell);
  const anchorCell = useGridStore((s) => s.anchorCell);
  const editingCell = useGridStore((s) => s.editingCell);
  const setActiveCell = useGridStore((s) => s.setActiveCell);
  const setEditingCell = useGridStore((s) => s.setEditingCell);
  const pushUndo = useGridStore((s) => s.pushUndo);
  const selectedRowIds = useGridStore((s) => s.selectedRowIds);
  const toggleRowSelected = useGridStore((s) => s.toggleRowSelected);
  const clearRowSelection = useGridStore((s) => s.clearRowSelection);

  const selectionRange = getSelectionRange(anchorCell, activeCell);

  const totalWidth =
    CHECKBOX_COL_WIDTH +
    ROW_NUMBER_COL_WIDTH +
    visibleFields.reduce((sum, f) => sum + f.width, 0) +
    40;

  const rowVirtualizer = useVirtualizer({
    count: displayRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => (displayRows[index]?.kind === "group" ? GROUP_HEADER_HEIGHT : ROW_HEIGHT),
    overscan: 12,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    const last = virtualItems[virtualItems.length - 1];
    const lastDataRowIndex = last ? displayRows[last.index]?.rowIndex ?? -1 : -1;
    if (
      lastDataRowIndex >= 0 &&
      lastDataRowIndex >= candidates.length - 20 &&
      candidatesQuery.hasNextPage &&
      !candidatesQuery.isFetchingNextPage
    ) {
      void candidatesQuery.fetchNextPage();
    }
  }, [virtualItems, candidates.length, candidatesQuery, displayRows]);

  const updateMutation = useMutation({
    mutationFn: ({ id, fields: f }: { id: string; fields: Record<string, unknown> }) =>
      updateCandidateFields(id, f),
    onMutate: ({ id, fields: f }) => {
      const candidate = candidates.find((c) => c.id === id);
      if (!candidate) return;
      const snapshots = queryClient.getQueriesData<CandidatesInfiniteData>({ queryKey: CANDIDATES_QUERY_PREFIX });
      patchCandidateInCache(queryClient, buildOptimisticPatch(candidate, f, pipelineStages, users, fields));
      return { snapshots };
    },
    onSuccess: (updated) => patchCandidateInCache(queryClient, updated),
    onError: (err, _vars, context) => {
      if (context?.snapshots) {
        for (const [key, data] of context.snapshots) queryClient.setQueryData(key, data);
      }
      toast.error(err instanceof ApiError ? err.message : "Không lưu được thay đổi");
    },
  });

  const createMutation = useMutation({
    mutationFn: createCandidate,
    onSuccess: (created) => prependCandidateInCache(queryClient, created, candidatesQueryKey),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Không tạo được ứng viên"),
  });

  function reportBulkResult(action: string, result: { succeeded: string[]; failed: { id: string; reason: string }[] }) {
    if (result.failed.length === 0) {
      toast.success(`Đã ${action} ${result.succeeded.length} ứng viên.`);
    } else {
      toast.warning(
        `${action} thành công ${result.succeeded.length}, lỗi ${result.failed.length} dòng: ${result.failed
          .slice(0, 3)
          .map((f) => f.reason)
          .join(", ")}`,
      );
    }
  }

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, statusId }: { ids: string[]; statusId: string }) =>
      bulkUpdateStatus(ids, statusId),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: CANDIDATES_QUERY_PREFIX, exact: false });
      reportBulkResult("đổi trạng thái", result);
      clearRowSelection();
    },
    onError: () => toast.error("Không đổi được trạng thái theo lô"),
  });

  const bulkRecruiterMutation = useMutation({
    mutationFn: ({ ids, recruiterId }: { ids: string[]; recruiterId: string | null }) =>
      bulkUpdateRecruiter(ids, recruiterId),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: CANDIDATES_QUERY_PREFIX, exact: false });
      reportBulkResult("đổi recruiter", result);
      clearRowSelection();
    },
    onError: () => toast.error("Không đổi được recruiter theo lô"),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteCandidates(ids),
    onSuccess: (result) => {
      removeCandidatesFromCache(queryClient, result.succeeded);
      reportBulkResult("xoá", result);
      clearRowSelection();
    },
    onError: () => toast.error("Không xoá được theo lô"),
  });

  const bulkExportMutation = useMutation({
    mutationFn: (ids: string[]) => {
      const visibleFieldKeys = visibleFields.map((f) => f.fieldKey);
      return downloadCandidatesExport("xlsx", visibleFieldKeys, queryParams, ids);
    },
    onSuccess: () => toast.success("Đã xuất file các dòng đã chọn."),
    onError: () => toast.error("Không xuất được file"),
  });

  const exportMutation = useMutation({
    mutationFn: (format: "xlsx" | "csv") => {
      const visibleFieldKeys = visibleFields.map((f) => f.fieldKey);
      return downloadCandidatesExport(format, visibleFieldKeys, queryParams);
    },
    onSuccess: ({ truncated }) => {
      if (truncated) {
        toast.warning("Danh sách quá lớn — chỉ xuất 20.000 dòng đầu theo bộ lọc/sắp xếp hiện tại.");
      } else {
        toast.success("Đã xuất file thành công.");
      }
    },
    onError: () => toast.error("Không xuất được file"),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => importCandidatesFile(file),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: CANDIDATES_QUERY_PREFIX, exact: false });
      if (result.errorCount === 0) {
        toast.success(`Đã nhập ${result.createdCount} ứng viên thành công.`);
      } else {
        toast.warning(
          `Đã nhập ${result.createdCount} ứng viên, ${result.errorCount} dòng lỗi: ` +
            result.errors
              .slice(0, 3)
              .map((e) => `dòng ${e.row} (${e.message})`)
              .join(", "),
        );
      }
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Không nhập được file"),
  });

  const createFieldMutation = useMutation({
    mutationFn: (input: {
      label: string;
      fieldKey: string;
      fieldType: (typeof CREATABLE_CUSTOM_FIELD_TYPES)[number];
      options?: Record<string, unknown>;
    }) => createFieldDefinition(TABLE_KEY, input),
    onSuccess: (created) => {
      queryClient.setQueryData<FieldDefinitionDto[]>(FIELD_DEFS_QUERY_KEY, (old = []) => [...old, created]);

      const pending = pendingInsertRef.current;
      if (pending) {
        pendingInsertRef.current = null;
        const allFields = queryClient.getQueryData<FieldDefinitionDto[]>(FIELD_DEFS_QUERY_KEY) ?? [];
        const adjIdx = allFields.findIndex((f) => f.id === pending.fieldId);
        if (adjIdx !== -1) {
          const without = allFields.filter((f) => f.id !== created.id);
          const insertIdx = pending.side === "left" ? adjIdx : adjIdx + 1;
          const reordered = [...without];
          reordered.splice(insertIdx, 0, created);
          queryClient.setQueryData<FieldDefinitionDto[]>(FIELD_DEFS_QUERY_KEY, reordered);
          reorderMutation.mutate(reordered.map((f) => f.id));
        }
      }
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Không tạo được trường"),
  });

  const updateFieldMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateFieldDefinition>[1] }) =>
      updateFieldDefinition(id, input),
    onSuccess: (updated) =>
      queryClient.setQueryData<FieldDefinitionDto[]>(FIELD_DEFS_QUERY_KEY, (old = []) =>
        old.map((f) => (f.id === updated.id ? updated : f)),
      ),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Không sửa được trường"),
  });

  const deleteFieldMutation = useMutation({
    mutationFn: (id: string) => deleteFieldDefinition(id),
    onSuccess: (_data, id) =>
      queryClient.setQueryData<FieldDefinitionDto[]>(FIELD_DEFS_QUERY_KEY, (old = []) =>
        old.filter((f) => f.id !== id),
      ),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Không xoá được trường"),
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => reorderFieldDefinitions(TABLE_KEY, orderedIds),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Không lưu được thứ tự cột"),
  });

  function handleCommitEdit(candidateId: string, field: FieldDefinitionDto, value: unknown) {
    const candidate = candidates.find((c) => c.id === candidateId);
    if (!candidate) return;

    const previousValue = getPreviousRawValue(candidate, field);
    if (previousValue !== value) {
      pushUndo({ candidateId, fieldKey: field.fieldKey, previousValue, nextValue: value });
      updateMutation.mutate({ id: candidateId, fields: { [field.fieldKey]: value } });
    }
    setEditingCell(null);

    if (activeCell) {
      setActiveCell({
        rowIndex: Math.min(activeCell.rowIndex + 1, candidates.length - 1),
        colIndex: activeCell.colIndex,
      });
    }
  }

  function handleUndo() {
    const entry = useGridStore.getState().popUndo();
    if (!entry) return;
    updateMutation.mutate({ id: entry.candidateId, fields: { [entry.fieldKey]: entry.previousValue } });
  }

  function handleRedo() {
    const entry = useGridStore.getState().popRedo();
    if (!entry) return;
    updateMutation.mutate({ id: entry.candidateId, fields: { [entry.fieldKey]: entry.nextValue } });
  }

  function handleCopy() {
    const range = getSelectionRange(anchorCell, activeCell);
    if (!range) return;
    const rows: string[][] = [];
    for (let r = range.rowStart; r <= range.rowEnd; r++) {
      const candidate = candidates[r];
      if (!candidate) continue;
      const row: string[] = [];
      for (let c = range.colStart; c <= range.colEnd; c++) {
        const field = visibleFields[c];
        row.push(field ? cellValueToText(getCellValue(candidate, field)) : "");
      }
      rows.push(row);
    }
    navigator.clipboard.writeText(rowsToTsv(rows)).catch(() => undefined);
  }

  async function handlePaste() {
    if (!activeCell) return;
    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      return;
    }
    const rows = tsvToRows(text);
    rows.forEach((rowValues, rOffset) => {
      const candidate = candidates[activeCell.rowIndex + rOffset];
      if (!candidate) return;
      rowValues.forEach((cellText, cOffset) => {
        const field = visibleFields[activeCell.colIndex + cOffset];
        if (!field || !isFieldEditable(field)) return;
        const coerced = coerceForPaste(field, cellText, pipelineStages, users);
        if (coerced === undefined) return;
        const previousValue = getPreviousRawValue(candidate, field);
        if (previousValue === coerced) return;
        pushUndo({ candidateId: candidate.id, fieldKey: field.fieldKey, previousValue, nextValue: coerced });
        updateMutation.mutate({ id: candidate.id, fields: { [field.fieldKey]: coerced } });
      });
    });
  }

  function handleClearSelection() {
    const range = getSelectionRange(anchorCell, activeCell);
    if (!range) return;
    for (let r = range.rowStart; r <= range.rowEnd; r++) {
      const candidate = candidates[r];
      if (!candidate) continue;
      for (let c = range.colStart; c <= range.colEnd; c++) {
        const field = visibleFields[c];
        if (!field || !isFieldEditable(field) || field.fieldKey === "statusId") continue;
        const previousValue = getPreviousRawValue(candidate, field);
        if (previousValue === null) continue;
        pushUndo({ candidateId: candidate.id, fieldKey: field.fieldKey, previousValue, nextValue: null });
        updateMutation.mutate({ id: candidate.id, fields: { [field.fieldKey]: null } });
      }
    }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const state = useGridStore.getState();
      if (state.editingCell) return;
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (!state.activeCell) return;

      const maxRow = candidates.length - 1;
      const maxCol = visibleFields.length - 1;
      const { rowIndex, colIndex } = state.activeCell;
      const mod = e.ctrlKey || e.metaKey;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        state.setActiveCell({ rowIndex: Math.min(rowIndex + 1, maxRow), colIndex }, e.shiftKey);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        state.setActiveCell({ rowIndex: Math.max(rowIndex - 1, 0), colIndex }, e.shiftKey);
      } else if (e.key === "ArrowRight" || (e.key === "Tab" && !e.shiftKey)) {
        e.preventDefault();
        state.setActiveCell({ rowIndex, colIndex: Math.min(colIndex + 1, maxCol) }, e.shiftKey && e.key !== "Tab");
      } else if (e.key === "ArrowLeft" || (e.key === "Tab" && e.shiftKey)) {
        e.preventDefault();
        state.setActiveCell({ rowIndex, colIndex: Math.max(colIndex - 1, 0) }, e.shiftKey && e.key !== "Tab");
      } else if (e.key === "Enter") {
        e.preventDefault();
        state.setEditingCell({ rowIndex, colIndex });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleClearSelection();
      } else if (mod && e.key.toLowerCase() === "c") {
        handleCopy();
      } else if (mod && e.key.toLowerCase() === "v") {
        void handlePaste();
      } else if (mod && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
      } else if (mod && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
        e.preventDefault();
        handleRedo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates, visibleFields, pipelineStages, users, anchorCell, activeCell]);

  function handleReorderField(fromId: string, toId: string) {
    const fromIndex = visibleFields.findIndex((f) => f.id === fromId);
    const toIndex = visibleFields.findIndex((f) => f.id === toId);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...visibleFields];
    const [moved] = reordered.splice(fromIndex, 1);
    if (moved) reordered.splice(toIndex, 0, moved);

    const finalOrder = [...reordered, ...hiddenFields];
    queryClient.setQueryData<FieldDefinitionDto[]>(
      FIELD_DEFS_QUERY_KEY,
      finalOrder.map((f, i) => ({ ...f, sortOrder: i })),
    );
    reorderMutation.mutate(finalOrder.map((f) => f.id));
  }

  function handleToggleSelectAll(checked: boolean) {
    useGridStore.setState({
      selectedRowIds: checked ? new Set(candidates.map((c) => c.id)) : new Set(),
    });
  }

  function handleDeleteSelectedRows() {
    if (selectedRowIds.size === 0) return;
    if (!window.confirm(`Xoá ${selectedRowIds.size} ứng viên đã chọn?`)) return;
    bulkDeleteMutation.mutate(Array.from(selectedRowIds));
  }

  function handleDeleteField(fieldId: string) {
    if (!window.confirm("Xoá trường này? Dữ liệu trong trường sẽ mất.")) return;
    deleteFieldMutation.mutate(fieldId);
  }

  function handleInsertField(fieldId: string, side: "left" | "right") {
    setInsertCtx({ fieldId, side });
  }

  const allRowsSelected = candidates.length > 0 && candidates.every((c) => selectedRowIds.has(c.id));

  if (fieldsQuery.isLoading || viewsQuery.isLoading || !activeViewId || candidatesQuery.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border">
      <ViewTabs
        views={views}
        activeViewId={activeViewId}
        currentUserId={currentUser?.id ?? ""}
        canManageShared={canManageShared}
        onSelect={(id) => {
          const view = views.find((v) => v.id === id);
          if (view) applyView(view);
        }}
        onCreate={(type) => {
          const name = window.prompt(
            "Tên chế độ xem mới:",
            type === "KANBAN" ? "Kanban mới" : "Chế độ xem mới",
          );
          if (name?.trim()) createViewMutation.mutate({ name: name.trim(), type });
        }}
        onRename={(id, name) => renameViewMutation.mutate({ id, name })}
        onDelete={(id) => {
          if (window.confirm("Xoá chế độ xem này?")) deleteViewMutation.mutate(id);
        }}
        onSetDefault={(id) => setDefaultViewMutation.mutate(id)}
      />

      <GridToolbar
        fields={fields}
        onAddRecordClick={() => addRecordInputRef.current?.focus()}
        onToggleFieldHidden={(fieldId, isHidden) =>
          updateFieldMutation.mutate({ id: fieldId, input: { isHidden } })
        }
        onUndo={handleUndo}
        onRedo={handleRedo}
        pipelineStages={pipelineStages}
        users={users}
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        sorts={sorts}
        onSortsChange={handleSortsChange}
        groupBy={groupBy}
        onGroupByChange={handleGroupByChange}
        colorRules={colorRules}
        onColorRulesChange={handleColorRulesChange}
        onExport={(format) => exportMutation.mutate(format)}
        onImportFile={(file) => importMutation.mutate(file)}
      />

      {selectedRowIds.size > 0 && (
        <div className="flex h-9 shrink-0 items-center gap-2 border-b bg-muted/40 px-3 text-sm">
          <span>Đã chọn {selectedRowIds.size} dòng</span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={bulkStatusMutation.isPending}>
                Đổi trạng thái
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {pipelineStages.map((stage) => (
                <DropdownMenuItem
                  key={stage.id}
                  onClick={() =>
                    bulkStatusMutation.mutate({
                      ids: Array.from(selectedRowIds),
                      statusId: stage.id,
                    })
                  }
                >
                  {stage.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={bulkRecruiterMutation.isPending}>
                Đổi recruiter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() =>
                  bulkRecruiterMutation.mutate({ ids: Array.from(selectedRowIds), recruiterId: null })
                }
              >
                Bỏ gán recruiter
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {users.map((u) => (
                <DropdownMenuItem
                  key={u.id}
                  onClick={() =>
                    bulkRecruiterMutation.mutate({
                      ids: Array.from(selectedRowIds),
                      recruiterId: u.id,
                    })
                  }
                >
                  {u.fullName}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            variant="outline"
            disabled={bulkExportMutation.isPending}
            onClick={() => bulkExportMutation.mutate(Array.from(selectedRowIds))}
          >
            Xuất file đã chọn
          </Button>

          <Button
            size="sm"
            variant="destructive"
            disabled={bulkDeleteMutation.isPending}
            onClick={handleDeleteSelectedRows}
          >
            Xoá
          </Button>
          <Button size="sm" variant="ghost" onClick={clearRowSelection}>
            Bỏ chọn
          </Button>
        </div>
      )}

      {activeView?.type === "KANBAN" ? (
        <KanbanBoard
          search={search}
          filters={filters}
          sorts={sorts}
          pipelineStages={pipelineStages}
          onOpenCandidate={(id) => setDrawerCandidateId(id)}
        />
      ) : (
      <div ref={scrollRef} className="relative flex-1 overflow-auto">
        <GridHeaderRow
          fields={visibleFields}
          allRowsSelected={allRowsSelected}
          onToggleSelectAll={handleToggleSelectAll}
          onReorder={handleReorderField}
          onRename={(fieldId, label) => updateFieldMutation.mutate({ id: fieldId, input: { label } })}
          onToggleHidden={(fieldId, isHidden) =>
            updateFieldMutation.mutate({ id: fieldId, input: { isHidden } })
          }
          onDelete={handleDeleteField}
          onInsertLeft={(fieldId) => handleInsertField(fieldId, "left")}
          onInsertRight={(fieldId) => handleInsertField(fieldId, "right")}
          onResizeEnd={(fieldId, width) => updateFieldMutation.mutate({ id: fieldId, input: { width } })}
          onEdit={(fieldId, input) => updateFieldMutation.mutate({ id: fieldId, input })}
          onCreateField={(input) => {
            createFieldMutation.mutate(input);
          }}
          addColumnOpen={addColumnOpen}
          onAddColumnOpenChange={setAddColumnOpen}
        />

        <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
          {virtualItems.map((virtualRow) => {
            const displayRow = displayRows[virtualRow.index];
            if (!displayRow) return null;

            if (displayRow.kind === "group") {
              return (
                <div
                  key={`group-${virtualRow.index}`}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: totalWidth,
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <GridGroupHeaderRow
                    label={displayRow.label ?? ""}
                    count={displayRow.count ?? 0}
                    width={totalWidth}
                  />
                </div>
              );
            }

            const candidate = displayRow.candidate;
            const rowIndex = displayRow.rowIndex;
            if (!candidate) return null;
            const rowColor = resolveRowColor(candidate, colorRules, fieldsByKey);

            return (
              <div
                key={candidate.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: totalWidth,
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                  backgroundColor: rowColor ? `${rowColor}33` : undefined,
                }}
                className="flex"
              >
                <div
                  style={{ width: CHECKBOX_COL_WIDTH }}
                  className="flex h-8 shrink-0 items-center justify-center border-b border-r"
                >
                  <Checkbox
                    checked={selectedRowIds.has(candidate.id)}
                    onCheckedChange={() => toggleRowSelected(candidate.id)}
                  />
                </div>
                <div
                  style={{ width: ROW_NUMBER_COL_WIDTH }}
                  className="group flex h-8 shrink-0 items-center justify-center border-b border-r text-xs text-muted-foreground"
                >
                  <span className="group-hover:hidden">{rowIndex + 1}</span>
                  <button
                    type="button"
                    aria-label="Mở chi tiết ứng viên"
                    className="hidden items-center justify-center rounded p-0.5 hover:bg-muted group-hover:flex"
                    onClick={() => setDrawerCandidateId(candidate.id)}
                  >
                    <Maximize2 className="size-3.5" />
                  </button>
                </div>
                {visibleFields.map((field, colIndex) => (
                  <GridCell
                    key={field.id}
                    candidate={candidate}
                    field={field}
                    width={field.width}
                    isActive={activeCell?.rowIndex === rowIndex && activeCell?.colIndex === colIndex}
                    isInRange={isCellInRange({ rowIndex, colIndex }, selectionRange)}
                    isEditing={editingCell?.rowIndex === rowIndex && editingCell?.colIndex === colIndex}
                    pipelineStages={pipelineStages}
                    users={users}
                    allMktLists={allMktLists}
                    onActivate={(extend) => setActiveCell({ rowIndex, colIndex }, extend)}
                    onStartEdit={() => setEditingCell({ rowIndex, colIndex })}
                    onCommit={(value) => handleCommitEdit(candidate.id, field, value)}
                    onCancelEdit={() => setEditingCell(null)}
                  />
                ))}
              </div>
            );
          })}
        </div>

        <AddRecordRow
          ref={addRecordInputRef}
          totalWidth={totalWidth}
          onSubmit={(fullName) => createMutation.mutate({ fullName })}
        />
      </div>
      )}

      <CandidateDrawer candidateId={drawerCandidateId} onClose={() => setDrawerCandidateId(null)} />

      <AddFieldDialog
        existingFields={fields}
        open={!!insertCtx}
        side={insertCtx?.side ?? "right"}
        adjacentFieldLabel={insertCtx ? (fields.find((f) => f.id === insertCtx.fieldId)?.label ?? undefined) : undefined}
        onOpenChange={(v) => { if (!v) setInsertCtx(null); }}
        onCreate={(input) => {
          if (!insertCtx) return;
          pendingInsertRef.current = { fieldId: insertCtx.fieldId, side: insertCtx.side };
          createFieldMutation.mutate(input);
          setInsertCtx(null);
        }}
      />
    </div>
  );
}

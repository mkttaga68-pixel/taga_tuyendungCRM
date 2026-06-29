import { create } from "zustand";

export interface CellPos {
  rowIndex: number;
  colIndex: number;
}

export interface UndoEntry {
  candidateId: string;
  fieldKey: string;
  previousValue: unknown;
  nextValue: unknown;
}

interface GridState {
  /** Ô đang focus (di chuyển bằng phím mũi tên, Tab, Enter). */
  activeCell: CellPos | null;
  /** Điểm bắt đầu khi kéo chọn nhiều ô — cùng với activeCell tạo thành 1 vùng chọn. */
  anchorCell: CellPos | null;
  /** Ô đang ở chế độ nhập liệu (double-click / Enter trên activeCell). */
  editingCell: CellPos | null;

  undoStack: UndoEntry[];
  redoStack: UndoEntry[];

  selectedRowIds: Set<string>;

  setActiveCell: (cell: CellPos | null, extendSelection?: boolean) => void;
  setEditingCell: (cell: CellPos | null) => void;
  pushUndo: (entry: UndoEntry) => void;
  popUndo: () => UndoEntry | undefined;
  popRedo: () => UndoEntry | undefined;
  toggleRowSelected: (rowId: string) => void;
  clearRowSelection: () => void;
}

export const useGridStore = create<GridState>((set, get) => ({
  activeCell: null,
  anchorCell: null,
  editingCell: null,
  undoStack: [],
  redoStack: [],
  selectedRowIds: new Set(),

  setActiveCell: (cell, extendSelection = false) =>
    set((state) => ({
      activeCell: cell,
      anchorCell: extendSelection ? state.anchorCell ?? state.activeCell ?? cell : cell,
      editingCell: null,
    })),

  setEditingCell: (cell) => set({ editingCell: cell }),

  pushUndo: (entry) =>
    set((state) => ({ undoStack: [...state.undoStack, entry], redoStack: [] })),

  popUndo: () => {
    const { undoStack, redoStack } = get();
    const entry = undoStack[undoStack.length - 1];
    if (!entry) return undefined;
    set({ undoStack: undoStack.slice(0, -1), redoStack: [...redoStack, entry] });
    return entry;
  },

  popRedo: () => {
    const { redoStack, undoStack } = get();
    const entry = redoStack[redoStack.length - 1];
    if (!entry) return undefined;
    set({ redoStack: redoStack.slice(0, -1), undoStack: [...undoStack, entry] });
    return entry;
  },

  toggleRowSelected: (rowId) =>
    set((state) => {
      const next = new Set(state.selectedRowIds);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return { selectedRowIds: next };
    }),

  clearRowSelection: () => set({ selectedRowIds: new Set() }),
}));

export function getSelectionRange(anchor: CellPos | null, active: CellPos | null) {
  if (!anchor || !active) return null;
  return {
    rowStart: Math.min(anchor.rowIndex, active.rowIndex),
    rowEnd: Math.max(anchor.rowIndex, active.rowIndex),
    colStart: Math.min(anchor.colIndex, active.colIndex),
    colEnd: Math.max(anchor.colIndex, active.colIndex),
  };
}

export function isCellInRange(
  pos: CellPos,
  range: ReturnType<typeof getSelectionRange>,
): boolean {
  if (!range) return false;
  return (
    pos.rowIndex >= range.rowStart &&
    pos.rowIndex <= range.rowEnd &&
    pos.colIndex >= range.colStart &&
    pos.colIndex <= range.colEnd
  );
}

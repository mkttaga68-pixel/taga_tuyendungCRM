import type { AutomationNode } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

/** Scratch state mang theo suốt 1 run — qua các lần resume sau DELAY/WAIT. */
export interface ExecutionVars {
  /** vars[key] do FUNCTION/UPDATE_RECORD ghi, dùng cho node sau qua {{vars.key}} */
  vars: Record<string, unknown>;
  /** Trạng thái lặp theo từng LOOP node — key = nodeKey. */
  loopState: Record<string, { items: unknown[]; index: number }>;
}

export interface NodeExecutorParams {
  node: Pick<AutomationNode, "nodeKey" | "type" | "config">;
  prisma: PrismaClient;
  triggerRecordTable: string;
  triggerRecordId: string | null;
  execVars: ExecutionVars;
  /** outgoing edge conditionLabel hiện có trên node này — để biết SWITCH/LOOP có nhánh nào. */
  outgoingLabels: string[];
}

export interface NodeExecutorResult {
  output: unknown;
  /** Cạnh cần đi tiếp (theo conditionLabel) — undefined nếu node chỉ có 1 cạnh ra (đi luôn cạnh đó). */
  branchLabel?: string;
  /** Có giá trị nếu node cần dừng job hiện tại, resume sau delayMs (DELAY/WAIT). */
  delayMs?: number;
}

export type NodeExecutor = (params: NodeExecutorParams) => Promise<NodeExecutorResult>;

"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  AUTOMATION_NODE_TYPE_LABELS,
  DEFERRED_NODE_TYPES,
  type AutomationNodeType,
} from "@taga-crm/shared";
import { cn } from "@/lib/utils";

export interface AutomationNodeData {
  type: AutomationNodeType;
  config: Record<string, unknown>;
  isEntry?: boolean;
  [key: string]: unknown;
}

const CATEGORY_COLOR: Record<string, string> = {
  logic: "border-amber-400 bg-amber-50",
  action: "border-sky-400 bg-sky-50",
};

export function AutomationNodeView({ data, selected }: NodeProps) {
  const nodeData = data as unknown as AutomationNodeData;
  const isDeferred = DEFERRED_NODE_TYPES.has(nodeData.type);
  const isBranching = ["IF", "CONDITION", "SWITCH", "LOOP"].includes(nodeData.type);

  return (
    <div
      className={cn(
        "min-w-40 rounded-md border-2 bg-white px-3 py-2 text-xs shadow-sm",
        CATEGORY_COLOR[nodeData.type === "ELSE" ? "logic" : isBranching ? "logic" : "action"] ??
          "border-gray-300",
        selected && "ring-2 ring-primary",
      )}
    >
      <Handle type="target" position={Position.Top} />
      {nodeData.isEntry && (
        <span className="absolute -top-2 -left-2 rounded bg-primary px-1 text-[10px] text-primary-foreground">
          Bắt đầu
        </span>
      )}
      <div className="font-medium">{AUTOMATION_NODE_TYPE_LABELS[nodeData.type]}</div>
      {isDeferred && <div className="mt-0.5 text-[10px] text-amber-600">Hoàn thiện ở Sprint 6</div>}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

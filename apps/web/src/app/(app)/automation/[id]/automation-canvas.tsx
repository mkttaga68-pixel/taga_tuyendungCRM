"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AUTOMATION_NODE_CATEGORY,
  AUTOMATION_NODE_TYPE_LABELS,
  AUTOMATION_NODE_TYPES,
  type AutomationNodeInput,
  type AutomationNodeType,
  type AutomationWorkflowGraphDto,
} from "@taga-crm/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getWorkflowGraph, saveWorkflowGraph, testRunWorkflow } from "@/lib/automation-api";
import { lookupUsers } from "@/lib/users-lookup-api";
import { ApiError } from "@/lib/api-client";
import { AutomationNodeView, type AutomationNodeData } from "./automation-node";
import { NodeConfigPanel } from "./node-config-panel";
import { CandidatePicker } from "./candidate-picker";

const NODE_TYPES = { automationNode: AutomationNodeView };
const CATEGORY_LABEL: Record<string, string> = { logic: "Logic", action: "Action" };

function generateNodeKey(type: AutomationNodeType): string {
  return `${type.toLowerCase()}_${Math.random().toString(36).slice(2, 8)}`;
}

function graphToFlow(graph: AutomationWorkflowGraphDto): {
  nodes: Node<AutomationNodeData>[];
  edges: Edge[];
} {
  return {
    nodes: graph.nodes.map((n) => ({
      id: n.nodeKey,
      type: "automationNode",
      position: { x: n.positionX, y: n.positionY },
      data: { type: n.type, config: n.config, isEntry: n.isEntry },
    })),
    edges: graph.edges.map((e) => ({
      id: `${e.fromNodeKey}->${e.toNodeKey}-${e.conditionLabel ?? ""}`,
      source: e.fromNodeKey,
      target: e.toNodeKey,
      label: e.conditionLabel,
      data: { conditionLabel: e.conditionLabel },
    })),
  };
}

/** Shell — chỉ fetch graph, không tự ghép state ở đây (tránh setState trong
 * queryFn/effect dễ mất đồng bộ khi React Query phục vụ lại từ cache). Component
 * con dùng key=workflowId để mount mới mỗi khi đổi workflow, lazy-init state
 * thẳng từ initialGraph đã có sẵn lúc render đầu tiên. */
export function AutomationCanvas({ workflowId }: { workflowId: string }) {
  const graphQuery = useQuery({
    queryKey: ["automation-workflows", workflowId, "graph"],
    queryFn: () => getWorkflowGraph(workflowId),
  });

  if (graphQuery.isLoading || !graphQuery.data) {
    return <div className="p-6 text-sm text-muted-foreground">Đang tải graph...</div>;
  }

  return (
    <AutomationCanvasInner
      key={workflowId}
      workflowId={workflowId}
      initialGraph={graphQuery.data}
    />
  );
}

function AutomationCanvasInner({
  workflowId,
  initialGraph,
}: {
  workflowId: string;
  initialGraph: AutomationWorkflowGraphDto;
}) {
  const queryClient = useQueryClient();
  const initialFlow = useMemo(() => graphToFlow(initialGraph), [initialGraph]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AutomationNodeData>>(
    initialFlow.nodes,
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialFlow.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [testRunOpen, setTestRunOpen] = useState(false);

  const usersQuery = useQuery({ queryKey: ["users-lookup"], queryFn: lookupUsers });

  const saveMutation = useMutation({
    mutationFn: () => {
      const nodeInputs: AutomationNodeInput[] = nodes.map((n) => ({
        nodeKey: n.id,
        type: n.data.type,
        config: n.data.config,
        positionX: n.position.x,
        positionY: n.position.y,
        isEntry: n.data.isEntry,
      }));
      const edgeInputs = edges.map((e) => ({
        fromNodeKey: e.source,
        toNodeKey: e.target,
        conditionLabel: (e.data?.conditionLabel as string | undefined) || undefined,
      }));
      return saveWorkflowGraph(workflowId, { nodes: nodeInputs, edges: edgeInputs });
    },
    onSuccess: () => {
      toast.success("Đã lưu workflow");
      queryClient.invalidateQueries({ queryKey: ["automation-workflows"], exact: true });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể lưu — kiểm tra lại graph");
    },
  });

  const testRunMutation = useMutation({
    mutationFn: (candidateId: string) => testRunWorkflow(workflowId, candidateId),
    onSuccess: () => {
      toast.success("Đã chạy thử — xem kết quả ở tab Lịch sử chạy");
      setTestRunOpen(false);
      queryClient.invalidateQueries({ queryKey: ["automation-workflows", workflowId, "runs"] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Không thể chạy thử");
    },
  });

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      let conditionLabel: string | undefined;
      const sourceType = sourceNode?.data.type;
      if (sourceType === "IF" || sourceType === "CONDITION") {
        const input = window.prompt('Nhập "true" hoặc "false" cho cạnh này:', "true");
        if (input === null) return;
        conditionLabel = input;
      } else if (sourceType === "SWITCH") {
        const input = window.prompt('Nhập giá trị cần khớp cho cạnh này (hoặc "default"):');
        if (input === null) return;
        conditionLabel = input;
      } else if (sourceType === "LOOP") {
        const input = window.prompt('Nhập "body" (chạy mỗi vòng) hoặc "done" (sau khi hết):', "body");
        if (input === null) return;
        conditionLabel = input;
      }
      setEdges((eds) =>
        addEdge({ ...connection, label: conditionLabel, data: { conditionLabel } }, eds),
      );
    },
    [nodes, setEdges],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/automation-node-type") as AutomationNodeType;
      if (!type) return;
      const bounds = (event.target as HTMLElement).closest(".react-flow")?.getBoundingClientRect();
      const position = bounds
        ? { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
        : { x: 100, y: 100 };
      const nodeKey = generateNodeKey(type);
      const isEntry = nodes.length === 0;
      setNodes((nds) => [
        ...nds,
        { id: nodeKey, type: "automationNode", position, data: { type, config: {}, isEntry } },
      ]);
    },
    [nodes.length, setNodes],
  );

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  function updateSelectedNodeConfig(config: Record<string, unknown>) {
    setNodes((nds) => nds.map((n) => (n.id === selectedNodeId ? { ...n, data: { ...n.data, config } } : n)));
  }

  function toggleSelectedNodeEntry(isEntry: boolean) {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, isEntry: n.id === selectedNodeId ? isEntry : isEntry ? false : n.data.isEntry },
      })),
    );
  }

  function deleteSelectedNode() {
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }

  const grouped = useMemo(() => {
    const groups: Record<string, AutomationNodeType[]> = { logic: [], action: [] };
    for (const type of AUTOMATION_NODE_TYPES) {
      // CONDITION dùng chung executor với IF — ẩn khỏi palette tránh nhầm lẫn
      if (type === "CONDITION") continue;
      groups[AUTOMATION_NODE_CATEGORY[type]].push(type);
    }
    return groups;
  }, []);

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-100">
      <div className="w-44 shrink-0 overflow-y-auto border-r p-2">
        {Object.entries(grouped).map(([category, types]) => (
          <div key={category} className="mb-3">
            <p className="mb-1 text-xs font-semibold text-muted-foreground">
              {CATEGORY_LABEL[category]}
            </p>
            {types.map((type) => (
              <div
                key={type}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("application/automation-node-type", type)}
                className="mb-1 cursor-grab rounded-md border bg-white px-2 py-1.5 text-xs hover:bg-muted"
              >
                {AUTOMATION_NODE_TYPE_LABELS[type]}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="relative flex-1" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
        <div className="absolute top-2 left-2 z-10 flex gap-2">
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setTestRunOpen(true)}>
            Test Run
          </Button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={NODE_TYPES}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          users={usersQuery.data ?? []}
          onChangeConfig={updateSelectedNodeConfig}
          onToggleEntry={toggleSelectedNodeEntry}
          onDelete={deleteSelectedNode}
          onSave={() => saveMutation.mutate()}
          isSaving={saveMutation.isPending}
        />
      )}

      <Dialog open={testRunOpen} onOpenChange={setTestRunOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Run — chọn ứng viên</DialogTitle>
          </DialogHeader>
          <CandidatePicker onPick={(candidateId) => testRunMutation.mutate(candidateId)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

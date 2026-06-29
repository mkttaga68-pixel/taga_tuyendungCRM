import type { AutomationEdge, AutomationNode, PrismaClient } from "@prisma/client";
import type { Queue } from "bullmq";
import type { AutomationJobData } from "@taga-crm/shared";
import { getNodeExecutor } from "./executors";
import type { ExecutionVars, NodeExecutorResult } from "./types";

const MAX_STEPS = 1000;
const LOOP_STATE_KEY = "__loopState";

function buildExecVarsFromJobData(vars: Record<string, unknown> | undefined): ExecutionVars {
  const source = { ...(vars ?? {}) };
  const loopState = (source[LOOP_STATE_KEY] as ExecutionVars["loopState"]) ?? {};
  delete source[LOOP_STATE_KEY];
  return { vars: source, loopState };
}

function serializeExecVars(execVars: ExecutionVars): Record<string, unknown> {
  return { ...execVars.vars, [LOOP_STATE_KEY]: execVars.loopState };
}

export async function runWorkflowJob(
  jobData: AutomationJobData,
  prisma: PrismaClient,
  queue: Queue<AutomationJobData>,
): Promise<void> {
  const { runId, workflowId, triggerRecordTable, triggerRecordId, resumeFromNodeKey } = jobData;

  const nodes: AutomationNode[] = await prisma.automationNode.findMany({ where: { workflowId } });
  const edges: AutomationEdge[] = await prisma.automationEdge.findMany({ where: { workflowId } });

  const nodeByKey = new Map<string, AutomationNode>(nodes.map((n) => [n.nodeKey, n]));
  const edgesFrom = new Map<string, AutomationEdge[]>();
  for (const edge of edges) {
    const existing: AutomationEdge[] = edgesFrom.get(edge.fromNodeKey) ?? [];
    existing.push(edge);
    edgesFrom.set(edge.fromNodeKey, existing);
  }

  const execVars = buildExecVarsFromJobData(jobData.vars);

  let currentNodeKey: string | undefined = resumeFromNodeKey ?? nodes.find((n) => n.isEntry)?.nodeKey;

  if (!currentNodeKey) {
    await markRunFailed(prisma, runId, "Graph chưa có node bắt đầu (isEntry) hoặc graph rỗng");
    return;
  }

  let steps = 0;
  try {
    while (currentNodeKey) {
      steps += 1;
      if (steps > MAX_STEPS) {
        throw new Error(`Vượt quá ${MAX_STEPS} bước thực thi — có thể graph bị lặp vô hạn`);
      }

      const node: AutomationNode | undefined = nodeByKey.get(currentNodeKey);
      if (!node) throw new Error(`Không tìm thấy node "${currentNodeKey}" trong graph`);

      const outgoing: AutomationEdge[] = edgesFrom.get(currentNodeKey) ?? [];
      const outgoingLabels: string[] = outgoing
        .map((e) => e.conditionLabel)
        .filter((l): l is string => !!l);

      const log = await prisma.automationRunLog.create({
        data: { runId, nodeKey: currentNodeKey, status: "RUNNING", input: node.config ?? {} },
      });

      let result: NodeExecutorResult;
      try {
        const executor = getNodeExecutor(node.type);
        result = await executor({
          node,
          prisma,
          triggerRecordTable,
          triggerRecordId,
          execVars,
          outgoingLabels,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await prisma.automationRunLog.update({
          where: { id: log.id },
          data: { status: "FAILED", finishedAt: new Date(), errorMessage: message },
        });
        throw err;
      }

      await prisma.automationRunLog.update({
        where: { id: log.id },
        data: { status: "SUCCESS", finishedAt: new Date(), output: result.output as object },
      });

      if (result.delayMs !== undefined) {
        const nextEdge = outgoing[0];
        if (!nextEdge) {
          // Không có node nào sau delay — chuỗi kết thúc ngay, không cần resume.
          await markRunSuccess(prisma, runId);
          return;
        }
        await queue.add(
          "resume",
          {
            runId,
            workflowId,
            triggerRecordTable,
            triggerRecordId,
            resumeFromNodeKey: nextEdge.toNodeKey,
            vars: serializeExecVars(execVars),
          },
          { delay: Math.max(0, result.delayMs) },
        );
        // Job hiện tại dừng ở đây, KHÔNG đổi status — run vẫn RUNNING, phần còn
        // lại chạy ở job resume sau delay và tự đóng status khi đó.
        return;
      }

      const chosenLabel = result.branchLabel;
      const nextEdge: AutomationEdge | undefined =
        chosenLabel !== undefined
          ? outgoing.find((e) => e.conditionLabel === chosenLabel)
          : outgoing[0];
      currentNodeKey = nextEdge?.toNodeKey;
    }

    await markRunSuccess(prisma, runId);
  } catch (err) {
    await markRunFailed(prisma, runId, err instanceof Error ? err.message : String(err));
  }
}

async function markRunSuccess(prisma: PrismaClient, runId: string): Promise<void> {
  await prisma.automationRun.update({
    where: { id: runId },
    data: { status: "SUCCESS", finishedAt: new Date() },
  });
}

async function markRunFailed(prisma: PrismaClient, runId: string, message: string): Promise<void> {
  await prisma.automationRun.update({
    where: { id: runId },
    data: { status: "FAILED", finishedAt: new Date(), errorMessage: message },
  });
}

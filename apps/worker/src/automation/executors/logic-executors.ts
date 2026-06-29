import { evaluateFilterCondition, ifConfigSchema, switchConfigSchema, loopConfigSchema } from "@taga-crm/shared";
import { fetchCandidateContext } from "../candidate-context";
import type { NodeExecutor } from "../types";

/** IF/CONDITION — 1 điều kiện, 2 nhánh "true"/"false" (đặt conditionLabel trên edge). */
export const ifExecutor: NodeExecutor = async ({ node, prisma, triggerRecordId, execVars }) => {
  const config = ifConfigSchema.parse(node.config);
  const candidate = await fetchCandidateContext(prisma, triggerRecordId);
  const record = { ...candidate, vars: execVars.vars };
  const result = candidate ? evaluateFilterCondition(record, config.condition) : false;
  return { output: { result }, branchLabel: result ? "true" : "false" };
};

/** ELSE — node placeholder, không có logic riêng, chỉ đi tiếp theo cạnh duy nhất. */
export const elseExecutor: NodeExecutor = async () => ({ output: null });

/** SWITCH — so khớp giá trị field với conditionLabel của từng cạnh ra, fallback "default". */
export const switchExecutor: NodeExecutor = async ({
  node,
  prisma,
  triggerRecordId,
  outgoingLabels,
}) => {
  const config = switchConfigSchema.parse(node.config);
  const candidate = await fetchCandidateContext(prisma, triggerRecordId);
  const value = candidate ? String(candidate[config.fieldKey] ?? "") : "";
  const matched = outgoingLabels.includes(value)
    ? value
    : outgoingLabels.includes("default")
      ? "default"
      : undefined;
  return { output: { value, matched }, branchLabel: matched };
};

/**
 * LOOP — lặp đồng bộ trong 1 lần chạy job (không hỗ trợ DELAY/WAIT trong thân loop,
 * tránh nổ số job khi lặp nhiều) qua items đọc từ customFields[sourceFieldKey] của
 * candidate, cạnh "body" chạy mỗi vòng, cạnh "done" chạy khi hết item — giới hạn
 * maxIterations để không treo worker nếu data có mảng quá lớn/lặp vô hạn do nhầm cấu hình.
 */
export const loopExecutor: NodeExecutor = async ({
  node,
  prisma,
  triggerRecordId,
  execVars,
}) => {
  const config = loopConfigSchema.parse(node.config);
  let current = execVars.loopState[node.nodeKey];

  if (!current) {
    const candidate = await fetchCandidateContext(prisma, triggerRecordId);
    const rawItems = (candidate?.customFields as Record<string, unknown> | undefined)?.[
      config.sourceFieldKey
    ];
    const items = Array.isArray(rawItems) ? rawItems.slice(0, config.maxIterations) : [];
    current = { items, index: 0 };
    execVars.loopState[node.nodeKey] = current;
  }

  if (current.index < current.items.length) {
    execVars.vars.loopItem = current.items[current.index];
    current.index += 1;
    return { output: { iteration: current.index, item: execVars.vars.loopItem }, branchLabel: "body" };
  }

  delete execVars.loopState[node.nodeKey];
  return { output: { done: true }, branchLabel: "done" };
};

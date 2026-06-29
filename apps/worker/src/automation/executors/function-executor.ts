import * as vm from "node:vm";
import { functionConfigSchema } from "@taga-crm/shared";
import { fetchCandidateContext } from "../candidate-context";
import type { NodeExecutor } from "../types";

const TIMEOUT_MS = 1000;

/**
 * Chạy code JS tự viết trong node FUNCTION. Dùng `node:vm` built-in (KHÔNG
 * dùng vm2 — package đó đã bị deprecated/có lỗ hổng sandbox escape công khai,
 * không nên thêm mới). `node:vm` không phải security boundary thật (không
 * chống được V8 exploit cố ý), nhưng đủ cách ly cho use-case nội bộ: chỉ
 * ADMIN/HR_MANAGER (đã có quyền ghi toàn hệ thống) mới tạo được Automation,
 * cùng mức tin cậy như khi họ tự thêm custom field/SQL filter — không phải
 * input từ người dùng ngoài, không cần chống tấn công có chủ đích.
 */
export const functionExecutor: NodeExecutor = async ({
  node,
  prisma,
  triggerRecordId,
  execVars,
}) => {
  const config = functionConfigSchema.parse(node.config);
  const candidate = await fetchCandidateContext(prisma, triggerRecordId);

  const sandbox: { context: Record<string, unknown>; __result: unknown } = {
    context: { candidate, vars: execVars.vars, loopItem: execVars.vars.loopItem },
    __result: undefined,
  };
  const vmContext = vm.createContext(sandbox);

  const script = new vm.Script(`__result = (function (context) {\n${config.code}\n})(context);`);
  try {
    script.runInContext(vmContext, { timeout: TIMEOUT_MS });
  } catch (err) {
    throw new Error(`Lỗi chạy FUNCTION: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (sandbox.context.vars && typeof sandbox.context.vars === "object") {
    Object.assign(execVars.vars, sandbox.context.vars as Record<string, unknown>);
  }

  return { output: { result: sandbox.__result } };
};

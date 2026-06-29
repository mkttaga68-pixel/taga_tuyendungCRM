import { interpolateTemplate, telegramConfigSchema } from "@taga-crm/shared";
import { fetchCandidateContext } from "../candidate-context";
import type { NodeExecutor } from "../types";

/** Telegram Bot API — credentials lấy từ config của chính node (botToken/chatId
 * do người tạo workflow tự nhập, không cần biến môi trường toàn hệ thống). */
export const telegramExecutor: NodeExecutor = async ({
  node,
  prisma,
  triggerRecordId,
  execVars,
}) => {
  const config = telegramConfigSchema.parse(node.config);
  const candidate = await fetchCandidateContext(prisma, triggerRecordId);
  const text = interpolateTemplate(config.messageTemplate, {
    candidate,
    vars: execVars.vars,
    loopItem: execVars.vars.loopItem,
  });

  const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: config.chatId, text }),
  });
  const body = (await response.json().catch(() => null)) as { description?: string } | null;

  if (!response.ok) {
    throw new Error(`Telegram trả về lỗi: ${body?.description ?? response.status}`);
  }

  return { output: { sent: true, text } };
};

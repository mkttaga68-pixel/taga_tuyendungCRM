import { interpolateTemplate, slackConfigSchema } from "@taga-crm/shared";
import { fetchCandidateContext } from "../candidate-context";
import type { NodeExecutor } from "../types";

/** Slack Incoming Webhook — webhookUrl do người tạo workflow tự nhập trong
 * config của node, không cần biến môi trường toàn hệ thống. */
export const slackExecutor: NodeExecutor = async ({
  node,
  prisma,
  triggerRecordId,
  execVars,
}) => {
  const config = slackConfigSchema.parse(node.config);
  const candidate = await fetchCandidateContext(prisma, triggerRecordId);
  const text = interpolateTemplate(config.messageTemplate, {
    candidate,
    vars: execVars.vars,
    loopItem: execVars.vars.loopItem,
  });

  const response = await fetch(config.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const responseText = await response.text().catch(() => "");

  if (!response.ok) {
    throw new Error(`Slack webhook trả về lỗi HTTP ${response.status}: ${responseText.slice(0, 300)}`);
  }

  return { output: { sent: true, text } };
};

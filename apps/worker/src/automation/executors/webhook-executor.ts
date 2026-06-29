import { interpolateTemplate, webhookConfigSchema } from "@taga-crm/shared";
import { fetchCandidateContext } from "../candidate-context";
import type { NodeExecutor } from "../types";

export const webhookExecutor: NodeExecutor = async ({
  node,
  prisma,
  triggerRecordId,
  execVars,
}) => {
  const config = webhookConfigSchema.parse(node.config);
  const candidate = await fetchCandidateContext(prisma, triggerRecordId);
  const data = { candidate, vars: execVars.vars, loopItem: execVars.vars.loopItem };
  const body = config.bodyTemplate ? interpolateTemplate(config.bodyTemplate, data) : undefined;

  const response = await fetch(config.url, {
    method: config.method,
    headers: { "Content-Type": "application/json", ...(config.headers ?? {}) },
    body: config.method === "GET" ? undefined : body,
  });
  const responseText = await response.text().catch(() => "");

  if (!response.ok) {
    throw new Error(`Webhook trả về HTTP ${response.status}: ${responseText.slice(0, 500)}`);
  }

  return { output: { status: response.status, body: responseText.slice(0, 2000) } };
};

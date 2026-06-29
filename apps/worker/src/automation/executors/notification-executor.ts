import { interpolateTemplate, notificationConfigSchema } from "@taga-crm/shared";
import { fetchCandidateContext } from "../candidate-context";
import type { NodeExecutor } from "../types";

const RECRUITER_SENTINEL = "__recruiter__";

export const notificationExecutor: NodeExecutor = async ({
  node,
  prisma,
  triggerRecordId,
  execVars,
}) => {
  const config = notificationConfigSchema.parse(node.config);
  const candidate = await fetchCandidateContext(prisma, triggerRecordId);
  const data = { candidate, vars: execVars.vars, loopItem: execVars.vars.loopItem };

  let targetUserId = config.targetUserId;
  if (targetUserId === RECRUITER_SENTINEL) {
    targetUserId = (candidate?.recruiterId as string | null) ?? undefined;
  }
  if (!targetUserId) {
    return { output: { skipped: "Không xác định được người nhận thông báo" } };
  }

  const body = config.bodyTemplate ? interpolateTemplate(config.bodyTemplate, data) : null;
  const notification = await prisma.notification.create({
    data: {
      userId: targetUserId,
      type: "AUTOMATION",
      title: interpolateTemplate(config.title, data),
      body,
      link: triggerRecordId ? `/candidates?candidateId=${triggerRecordId}` : null,
    },
  });

  return { output: { notificationId: notification.id } };
};

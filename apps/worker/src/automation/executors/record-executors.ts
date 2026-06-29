import { Prisma } from "@prisma/client";
import {
  createRecordConfigSchema,
  deleteRecordConfigSchema,
  interpolateTemplate,
  updateRecordConfigSchema,
} from "@taga-crm/shared";
import { fetchCandidateContext } from "../candidate-context";
import type { NodeExecutor } from "../types";

const PLAIN_TEXT_FIELD_KEYS = new Set([
  "fullName",
  "phone",
  "email",
  "address",
  "areaBranch",
  "facebookLink",
  "note",
  "nextActionNote",
]);

/** Áp dụng patch field lên 1 candidate — bản rút gọn của CandidatesService.assignSystemField,
 * đủ cho automation (không cần check RBAC vì automation chạy như hệ thống). */
async function applyFieldPatch(
  prisma: import("@prisma/client").PrismaClient,
  candidateId: string,
  fields: Record<string, unknown>,
  interpolationData: Record<string, unknown>,
): Promise<void> {
  const fieldDefs = await prisma.fieldDefinition.findMany({ where: { tableKey: "candidates" } });
  const fieldDefMap = new Map(fieldDefs.map((f) => [f.fieldKey, f]));
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) return;

  const data: Record<string, unknown> = {};
  const customFields: Record<string, unknown> = {
    ...((candidate.customFields as Record<string, unknown>) ?? {}),
  };
  let touchedCustomFields = false;

  for (const [key, rawValue] of Object.entries(fields)) {
    const value = typeof rawValue === "string" ? interpolateTemplate(rawValue, interpolationData) : rawValue;
    const def = fieldDefMap.get(key);
    if (!def || !def.isSystem) {
      customFields[key] = value;
      touchedCustomFields = true;
      continue;
    }
    if (PLAIN_TEXT_FIELD_KEYS.has(key)) {
      data[key] = value;
    } else if (key === "statusId" && value) {
      data.status = { connect: { id: value } };
    } else if (key === "recruiterId") {
      data.recruiter = value ? { connect: { id: value } } : { disconnect: true };
    } else if (key === "tags" && Array.isArray(value)) {
      data.tags = value;
    }
  }
  if (touchedCustomFields) data.customFields = customFields;
  if (Object.keys(data).length === 0) return;

  await prisma.candidate.update({ where: { id: candidateId }, data });
}

export const updateRecordExecutor: NodeExecutor = async ({
  node,
  prisma,
  triggerRecordId,
  execVars,
}) => {
  const config = updateRecordConfigSchema.parse(node.config);
  if (!triggerRecordId) return { output: { skipped: "no trigger record" } };

  const candidate = await fetchCandidateContext(prisma, triggerRecordId);
  await applyFieldPatch(prisma, triggerRecordId, config.fields, {
    candidate,
    vars: execVars.vars,
    loopItem: execVars.vars.loopItem,
  });
  await prisma.auditLog.create({
    data: {
      entityTable: "candidates",
      entityId: triggerRecordId,
      action: "UPDATE",
      fieldName: "automation",
      newValue: config.fields as Prisma.InputJsonValue,
      changedBy: null,
    },
  });
  return { output: { updated: Object.keys(config.fields) } };
};

export const createRecordExecutor: NodeExecutor = async ({ node, prisma, execVars }) => {
  const config = createRecordConfigSchema.parse(node.config);
  const firstStage = await prisma.pipelineStage.findFirst({ orderBy: { sortOrder: "asc" } });
  if (!firstStage) throw new Error("Chưa có pipeline stage nào được seed");

  const fullNameRaw = config.fields.fullName;
  const fullName =
    typeof fullNameRaw === "string"
      ? interpolateTemplate(fullNameRaw, { vars: execVars.vars, loopItem: execVars.vars.loopItem })
      : null;
  if (!fullName?.trim()) {
    throw new Error('CREATE_RECORD thiếu "fullName" hợp lệ trong fields');
  }

  const created = await prisma.candidate.create({
    data: {
      fullName: fullName.trim(),
      source: "OTHER",
      statusId: firstStage.id,
      customFields: {} as Prisma.InputJsonValue,
    },
  });

  await applyFieldPatch(prisma, created.id, config.fields, {
    vars: execVars.vars,
    loopItem: execVars.vars.loopItem,
  });
  await prisma.candidateStageHistory.create({
    data: { candidateId: created.id, fromStageId: null, toStageId: firstStage.id, changedBy: null },
  });
  await prisma.auditLog.create({
    data: {
      entityTable: "candidates",
      entityId: created.id,
      action: "CREATE",
      newValue: { fullName: created.fullName, source: created.source } as Prisma.InputJsonValue,
      changedBy: null,
    },
  });

  return { output: { createdId: created.id } };
};

export const deleteRecordExecutor: NodeExecutor = async ({ node, prisma, triggerRecordId }) => {
  deleteRecordConfigSchema.parse(node.config);
  if (!triggerRecordId) return { output: { skipped: "no trigger record" } };

  await prisma.candidate.update({
    where: { id: triggerRecordId },
    data: { deletedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      entityTable: "candidates",
      entityId: triggerRecordId,
      action: "DELETE",
      changedBy: null,
    },
  });
  return { output: { deletedId: triggerRecordId } };
};

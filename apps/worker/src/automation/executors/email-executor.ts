import { emailConfigSchema, interpolateTemplate, type EmailBlock } from "@taga-crm/shared";
import { fetchCandidateContext } from "../candidate-context";
import { renderEmailTemplateToHtml } from "../mjml-renderer";
import type { NodeExecutor } from "../types";

async function getResendConfig(prisma: Parameters<NodeExecutor>[0]["prisma"]) {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: ["resend.apiKey", "resend.fromEmail", "resend.fromName"] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    apiKey: map["resend.apiKey"] ?? null,
    fromEmail: map["resend.fromEmail"] ?? null,
    fromName: map["resend.fromName"] ?? null,
  };
}

export const emailExecutor: NodeExecutor = async ({
  node,
  prisma,
  triggerRecordId,
  execVars,
}) => {
  const rawConfig = node.config as Record<string, unknown>;
  if (!rawConfig.to) {
    throw new Error(
      'Node Email chưa được điền trường "Gửi tới". Vào Automation Builder, chọn node Email và nhập email người nhận (VD: {{candidate.email}}).',
    );
  }
  const config = emailConfigSchema.parse(rawConfig);

  const resendCfg = await getResendConfig(prisma);
  const apiKey = resendCfg.apiKey;
  const fromAddress = resendCfg.fromEmail
    ? resendCfg.fromName
      ? `${resendCfg.fromName} <${resendCfg.fromEmail}>`
      : resendCfg.fromEmail
    : null;

  const candidate = await fetchCandidateContext(prisma, triggerRecordId);
  const data = { candidate, vars: execVars.vars, loopItem: execVars.vars.loopItem };
  const to = interpolateTemplate(config.to, data);

  if (!to || typeof to !== "string" || !to.includes("@")) {
    throw new Error(
      `Địa chỉ email người nhận không hợp lệ sau khi render: "${String(to)}". Kiểm tra trường "Gửi tới" trong node Email.`,
    );
  }

  let rawSubject: string;
  let rawHtml: string;
  if (config.templateId) {
    const template = await prisma.emailTemplate.findUnique({ where: { id: config.templateId } });
    if (!template) {
      throw new Error(`Không tìm thấy mẫu email với id ${config.templateId}`);
    }
    rawSubject = config.subject ?? template.subject;
    rawHtml = await renderEmailTemplateToHtml(template.blocks as unknown as EmailBlock[]);
  } else {
    rawSubject = config.subject ?? "";
    rawHtml = config.bodyTemplate ?? "";
  }

  const subject = interpolateTemplate(rawSubject, data);
  const html = interpolateTemplate(rawHtml, data);

  if (!apiKey || !fromAddress) {
    await prisma.emailLog.create({
      data: {
        templateId: config.templateId,
        toEmail: to,
        candidateId: triggerRecordId,
        subject,
        bodyHtml: html,
        status: "FAILED",
        errorMessage: "Chưa cấu hình Resend. Vào Cài đặt → Kết nối Email để thêm API key và địa chỉ gửi.",
      },
    });
    throw new Error("Resend chưa được cấu hình — vào Cài đặt → Kết nối Email");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from: fromAddress, to, subject, html }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
  const body = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;

  await prisma.emailLog.create({
    data: {
      templateId: config.templateId,
      toEmail: to,
      candidateId: triggerRecordId,
      subject,
      bodyHtml: html,
      status: response.ok ? "SENT" : "FAILED",
      providerMessageId: body?.id,
      sentAt: response.ok ? new Date() : null,
      errorMessage: response.ok ? null : body?.message ?? `HTTP ${response.status}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Resend trả về lỗi: ${body?.message ?? response.status}`);
  }

  return { output: { sent: true, providerMessageId: body?.id } };
};

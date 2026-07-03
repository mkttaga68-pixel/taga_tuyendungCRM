import { emailConfigSchema, interpolateTemplate, type EmailBlock } from "@taga-crm/shared";
import { fetchCandidateContext } from "../candidate-context";
import { renderEmailTemplateToHtml } from "../mjml-renderer";
import type { NodeExecutor } from "../types";

/**
 * Gửi email qua Resend (https://resend.com) — API đơn giản, chỉ cần 1 HTTP
 * POST, không cần SDK riêng. Cần RESEND_API_KEY + EMAIL_FROM_ADDRESS trong
 * .env (toàn hệ thống dùng chung 1 domain gửi, khác với Telegram/Slack —
 * mỗi automation gửi từ chatbot/webhook riêng nên nằm trong config node).
 */
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
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM_ADDRESS;

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
        errorMessage: "RESEND_API_KEY/EMAIL_FROM_ADDRESS chưa được cấu hình trong .env",
      },
    });
    throw new Error("RESEND_API_KEY/EMAIL_FROM_ADDRESS chưa được cấu hình — không gửi được email");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from: fromAddress, to, subject, html }),
  });
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

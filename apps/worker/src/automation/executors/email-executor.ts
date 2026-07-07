import { emailConfigSchema, interpolateTemplate, type EmailBlock } from "@taga-crm/shared";
import { fetchCandidateContext } from "../candidate-context";
import { renderEmailTemplateToHtml } from "../mjml-renderer";
import type { NodeExecutor } from "../types";

/** Convert ISO date YYYY-MM-DD → DD-MM-YYYY trong text (cả subject lẫn body). */
function formatIsoDates(text: string): string {
  return text.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, "$3-$2-$1");
}

/**
 * Wrap plain-text body template thành HTML email đúng chuẩn:
 * - font-weight: 400 rõ ràng tránh email client render mặc định quá dày
 * - **bold** → <strong>
 * - \n → <br> cho dòng mới
 */
function plainBodyToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const withBreaks = withBold.replace(/\n/g, "<br>");
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:400;line-height:1.7;color:#222;background:#fff;margin:0;padding:0;">
<div style="max-width:600px;margin:0 auto;padding:24px;">${withBreaks}</div>
</body></html>`;
}

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
  const _now = new Date();
  const today = `${String(_now.getDate()).padStart(2, "0")}-${String(_now.getMonth() + 1).padStart(2, "0")}-${_now.getFullYear()}`;
  const data = { candidate, vars: execVars.vars, loopItem: execVars.vars.loopItem, today };
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

  const subject = formatIsoDates(interpolateTemplate(rawSubject, data));
  const html = config.templateId
    ? formatIsoDates(interpolateTemplate(rawHtml, data))
    : plainBodyToHtml(formatIsoDates(interpolateTemplate(rawHtml, data)));

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

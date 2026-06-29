import { interpolateTemplate, smsConfigSchema } from "@taga-crm/shared";
import { fetchCandidateContext } from "../candidate-context";
import type { NodeExecutor } from "../types";

/** Gửi SMS qua Twilio REST API — cần TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER
 * trong .env (1 số gửi chung cho cả công ty, giống email, khác Telegram/Slack). */
export const smsExecutor: NodeExecutor = async ({
  node,
  prisma,
  triggerRecordId,
  execVars,
}) => {
  const config = smsConfigSchema.parse(node.config);
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER chưa được cấu hình — không gửi được SMS");
  }

  const candidate = await fetchCandidateContext(prisma, triggerRecordId);
  const body = interpolateTemplate(config.messageTemplate, {
    candidate,
    vars: execVars.vars,
    loopItem: execVars.vars.loopItem,
  });
  const to = interpolateTemplate(config.to, { candidate, vars: execVars.vars });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      },
      body: new URLSearchParams({ To: to, From: fromNumber, Body: body }).toString(),
    },
  );
  const responseBody = (await response.json().catch(() => null)) as
    | { sid?: string; message?: string }
    | null;

  if (!response.ok) {
    throw new Error(`Twilio trả về lỗi: ${responseBody?.message ?? response.status}`);
  }

  return { output: { sent: true, sid: responseBody?.sid } };
};

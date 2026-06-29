import {
  createGoogleCalendarEvent,
  googleCalendarConfigSchema,
  interpolateTemplate,
} from "@taga-crm/shared";
import { fetchCandidateContext } from "../candidate-context";
import { getValidGoogleAccessToken } from "../google/google-token-store";
import type { NodeExecutor, NodeExecutorParams } from "../types";

/**
 * Dùng cho cả GOOGLE_CALENDAR (event thường) và GOOGLE_MEET (event + link
 * Meet). Calendar dùng là của Recruiter đang được gán cho candidate trigger
 * — node không có field "chủ lịch" riêng, recruiterId là lựa chọn tự nhiên
 * nhất sẵn có trong candidate-context.
 */
async function runGoogleCalendarNode(
  { node, prisma, triggerRecordId, execVars }: NodeExecutorParams,
  withMeet: boolean,
) {
  const config = googleCalendarConfigSchema.parse(node.config);
  const candidate = await fetchCandidateContext(prisma, triggerRecordId);
  const data = { candidate, vars: execVars.vars, loopItem: execVars.vars.loopItem };

  const recruiterId = (candidate?.recruiterId as string | null) ?? null;
  if (!recruiterId) {
    throw new Error(
      "Ứng viên chưa có Recruiter được gán — không xác định được lịch Google Calendar nào để tạo event",
    );
  }

  const summary = interpolateTemplate(config.summary, data);
  const startDateTime = config.startDateTime;
  const endDateTime = new Date(
    new Date(startDateTime).getTime() + config.durationMinutes * 60_000,
  ).toISOString();

  const accessToken = await getValidGoogleAccessToken(prisma, recruiterId);
  const event = await createGoogleCalendarEvent({
    accessToken,
    summary,
    startDateTime,
    endDateTime,
    withMeet,
  });

  return {
    output: {
      eventId: event.eventId,
      htmlLink: event.htmlLink,
      meetLink: event.meetLink,
    },
  };
}

export const googleCalendarExecutor: NodeExecutor = (params) => runGoogleCalendarNode(params, false);
export const googleMeetExecutor: NodeExecutor = (params) => runGoogleCalendarNode(params, true);

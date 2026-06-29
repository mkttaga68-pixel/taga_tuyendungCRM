import { DEFERRED_NODE_TYPES, type AutomationNodeType } from "@taga-crm/shared";
import type { NodeExecutor } from "../types";
import { elseExecutor, ifExecutor, loopExecutor, switchExecutor } from "./logic-executors";
import { delayExecutor, waitExecutor } from "./delay-executor";
import { webhookExecutor } from "./webhook-executor";
import { notificationExecutor } from "./notification-executor";
import {
  createRecordExecutor,
  deleteRecordExecutor,
  updateRecordExecutor,
} from "./record-executors";
import { functionExecutor } from "./function-executor";
import { emailExecutor } from "./email-executor";
import { smsExecutor } from "./sms-executor";
import { telegramExecutor } from "./telegram-executor";
import { slackExecutor } from "./slack-executor";
import { googleCalendarExecutor, googleMeetExecutor } from "./google-calendar-executor";

const REGISTRY: Record<AutomationNodeType, NodeExecutor> = {
  IF: ifExecutor,
  CONDITION: ifExecutor,
  ELSE: elseExecutor,
  SWITCH: switchExecutor,
  LOOP: loopExecutor,
  DELAY: delayExecutor,
  WAIT: waitExecutor,
  WEBHOOK: webhookExecutor,
  NOTIFICATION: notificationExecutor,
  UPDATE_RECORD: updateRecordExecutor,
  CREATE_RECORD: createRecordExecutor,
  DELETE_RECORD: deleteRecordExecutor,
  FUNCTION: functionExecutor,
  EMAIL: emailExecutor,
  SMS: smsExecutor,
  TELEGRAM: telegramExecutor,
  SLACK: slackExecutor,
  GOOGLE_CALENDAR: googleCalendarExecutor,
  GOOGLE_MEET: googleMeetExecutor,
};

export function getNodeExecutor(type: AutomationNodeType): NodeExecutor {
  return REGISTRY[type];
}

export { DEFERRED_NODE_TYPES };

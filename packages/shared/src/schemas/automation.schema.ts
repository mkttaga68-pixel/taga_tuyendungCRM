import { z } from "zod";
import { AUTOMATION_NODE_TYPES, AUTOMATION_TRIGGER_TYPES } from "../enums/automation.enum";
import { filterConditionSchema } from "./view.schema";

// ============================================================
// NODE CONFIG — 1 schema riêng cho từng AutomationNodeType, dùng chung bởi
// frontend (render đúng form cấu hình theo loại node) và worker (validate
// trước khi thực thi, tránh chạy node với config sai hình dạng).
// ============================================================

export const conditionGroupSchema = z.object({
  logic: z.enum(["AND", "OR"]),
  conditions: z.array(filterConditionSchema).min(1),
});
export type ConditionGroup = z.infer<typeof conditionGroupSchema>;

export const ifConfigSchema = z.object({
  // Format mới: nhiều điều kiện với AND/OR
  conditionGroup: conditionGroupSchema.optional(),
  // Legacy: 1 điều kiện (backward compat cho node đã lưu trước đó)
  condition: filterConditionSchema.optional(),
});
export type IfConfig = z.infer<typeof ifConfigSchema>;

export const switchConfigSchema = z.object({ fieldKey: z.string().min(1) });
export type SwitchConfig = z.infer<typeof switchConfigSchema>;

export const delayConfigSchema = z.object({
  amount: z.number().int().positive(),
  unit: z.enum(["seconds", "minutes", "hours", "days", "weeks"]),
});
export type DelayConfig = z.infer<typeof delayConfigSchema>;

export const waitConfigSchema = z.object({ untilDateTime: z.string().datetime() });
export type WaitConfig = z.infer<typeof waitConfigSchema>;

export const webhookConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(["GET", "POST"]).default("POST"),
  headers: z.record(z.string(), z.string()).optional(),
  bodyTemplate: z.string().max(10_000).optional(),
});
export type WebhookConfig = z.infer<typeof webhookConfigSchema>;

export const notificationConfigSchema = z.object({
  targetUserId: z.string().min(1).optional(), // "__recruiter__" = recruiter của candidate đang chạy
  title: z.string().min(1).max(200),
  bodyTemplate: z.string().max(2000).optional(),
});
export type NotificationConfig = z.infer<typeof notificationConfigSchema>;

export const updateRecordConfigSchema = z.object({
  fields: z.record(z.string(), z.unknown()),
});
export type UpdateRecordConfig = z.infer<typeof updateRecordConfigSchema>;

export const createRecordConfigSchema = z.object({
  fields: z.record(z.string(), z.unknown()),
});
export type CreateRecordConfig = z.infer<typeof createRecordConfigSchema>;

export const deleteRecordConfigSchema = z.object({});
export type DeleteRecordConfig = z.infer<typeof deleteRecordConfigSchema>;

export const loopConfigSchema = z.object({
  sourceFieldKey: z.string().min(1),
  maxIterations: z.number().int().min(1).max(500).default(50),
});
export type LoopConfig = z.infer<typeof loopConfigSchema>;

export const functionConfigSchema = z.object({ code: z.string().min(1).max(20_000) });
export type FunctionConfig = z.infer<typeof functionConfigSchema>;

export const emptyConfigSchema = z.object({});

/**
 * Email node hỗ trợ 2 cách lấy nội dung: chọn `templateId` (mẫu đã lưu trong
 * Email Template Builder, render qua MJML) hoặc tự nhập `subject`/`bodyTemplate`
 * trực tiếp (HTML thô). Bắt buộc có 1 trong 2 — kiểm tra ở .refine() dưới.
 */
export const emailConfigSchema = z
  .object({
    to: z.string().min(1),
    templateId: z.string().min(1).optional(),
    subject: z.string().max(300).optional(),
    bodyTemplate: z.string().max(20_000).optional(),
  })
  .refine((v) => !!v.templateId || (!!v.subject && !!v.bodyTemplate), {
    message: "Cần chọn mẫu email đã lưu hoặc tự nhập chủ đề + nội dung",
  });
export const smsConfigSchema = z.object({
  to: z.string().min(1),
  messageTemplate: z.string().min(1).max(1000),
});
export const telegramConfigSchema = z.object({
  botToken: z.string().min(1),
  chatId: z.string().min(1),
  messageTemplate: z.string().min(1).max(4000),
});
export const slackConfigSchema = z.object({
  webhookUrl: z.string().url(),
  messageTemplate: z.string().min(1).max(4000),
});
export const googleCalendarConfigSchema = z.object({
  summary: z.string().min(1).max(300),
  startDateTime: z.string().datetime(),
  durationMinutes: z.number().int().positive().default(30),
});
export const googleMeetConfigSchema = googleCalendarConfigSchema;

export const NODE_CONFIG_SCHEMAS = {
  IF: ifConfigSchema,
  ELSE: emptyConfigSchema,
  SWITCH: switchConfigSchema,
  DELAY: delayConfigSchema,
  WAIT: waitConfigSchema,
  WEBHOOK: webhookConfigSchema,
  EMAIL: emailConfigSchema,
  SMS: smsConfigSchema,
  TELEGRAM: telegramConfigSchema,
  SLACK: slackConfigSchema,
  NOTIFICATION: notificationConfigSchema,
  GOOGLE_CALENDAR: googleCalendarConfigSchema,
  GOOGLE_MEET: googleMeetConfigSchema,
  UPDATE_RECORD: updateRecordConfigSchema,
  CREATE_RECORD: createRecordConfigSchema,
  DELETE_RECORD: deleteRecordConfigSchema,
  CONDITION: ifConfigSchema,
  LOOP: loopConfigSchema,
  FUNCTION: functionConfigSchema,
} as const;

// ============================================================
// WORKFLOW / NODE / EDGE — CRUD
// ============================================================

export const automationNodeSchema = z.object({
  nodeKey: z.string().min(1).max(64),
  type: z.enum(AUTOMATION_NODE_TYPES),
  config: z.record(z.string(), z.unknown()),
  positionX: z.number(),
  positionY: z.number(),
  /** Node engine bắt đầu chạy — đúng 1 node/graph phải đánh dấu true. */
  isEntry: z.boolean().optional(),
});
export type AutomationNodeInput = z.infer<typeof automationNodeSchema>;

export const automationEdgeSchema = z.object({
  fromNodeKey: z.string().min(1).max(64),
  toNodeKey: z.string().min(1).max(64),
  conditionLabel: z.string().max(100).optional(),
});
export type AutomationEdgeInput = z.infer<typeof automationEdgeSchema>;

export const createWorkflowSchema = z.object({
  name: z.string().min(1, "Tên không được để trống").max(200),
  triggerType: z.enum(AUTOMATION_TRIGGER_TYPES),
  triggerConfig: z.record(z.string(), z.unknown()).optional(),
});
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  isActive: z.boolean().optional(),
  triggerType: z.enum(AUTOMATION_TRIGGER_TYPES).optional(),
  triggerConfig: z.record(z.string(), z.unknown()).optional(),
});
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;

export const saveWorkflowGraphSchema = z.object({
  nodes: z.array(automationNodeSchema),
  edges: z.array(automationEdgeSchema),
});
export type SaveWorkflowGraphInput = z.infer<typeof saveWorkflowGraphSchema>;

export interface AutomationWorkflowDto {
  id: string;
  name: string;
  isActive: boolean;
  triggerType: (typeof AUTOMATION_TRIGGER_TYPES)[number];
  triggerConfig: Record<string, unknown>;
  creator: { id: string; fullName: string } | null;
  lastRunStatus: "RUNNING" | "SUCCESS" | "FAILED" | null;
  lastRunAt: string | null;
  lastRunErrorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationWorkflowGraphDto {
  nodes: AutomationNodeInput[];
  edges: AutomationEdgeInput[];
}

export interface AutomationRunLogDto {
  id: string;
  nodeKey: string;
  status: "RUNNING" | "SUCCESS" | "FAILED";
  input: unknown;
  output: unknown;
  startedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
}

export interface AutomationRunDto {
  id: string;
  workflowId: string;
  triggerRecordTable: string | null;
  triggerRecordId: string | null;
  status: "RUNNING" | "SUCCESS" | "FAILED";
  startedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
  logs: AutomationRunLogDto[];
}

export interface AutomationRunListResponse {
  items: AutomationRunDto[];
  hasMore: boolean;
}

export const automationRunListQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
export type AutomationRunListQuery = z.infer<typeof automationRunListQuerySchema>;

export const testRunSchema = z.object({ candidateId: z.string().uuid() });
export type TestRunInput = z.infer<typeof testRunSchema>;

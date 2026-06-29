import { z } from "zod";

export const AUDIT_ACTIONS = ["CREATE", "UPDATE", "DELETE"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const auditLogQuerySchema = z.object({
  entityTable: z.string().min(1).max(64).optional(),
  entityId: z.string().uuid().optional(),
  action: z.enum(AUDIT_ACTIONS).optional(),
  changedBy: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;

export interface AuditLogDto {
  id: string;
  entityTable: string;
  entityId: string;
  entityLabel: string | null;
  action: AuditAction;
  fieldName: string | null;
  oldValue: unknown;
  newValue: unknown;
  changedBy: string | null;
  changedByName: string | null;
  changedAt: string;
}

export interface AuditLogListResponse {
  items: AuditLogDto[];
  hasMore: boolean;
}

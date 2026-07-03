import { z } from "zod";

export const createCustomTableSchema = z.object({
  name: z.string().min(1, "Tên bảng không được để trống").max(100),
  description: z.string().max(500).optional(),
});
export type CreateCustomTableInput = z.infer<typeof createCustomTableSchema>;

export const updateCustomTableSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});
export type UpdateCustomTableInput = z.infer<typeof updateCustomTableSchema>;

export const createCustomRecordSchema = z.object({
  data: z.record(z.string(), z.unknown()).optional(),
});
export type CreateCustomRecordInput = z.infer<typeof createCustomRecordSchema>;

export const updateCustomRecordSchema = z.object({
  data: z.record(z.string(), z.unknown()),
});
export type UpdateCustomRecordInput = z.infer<typeof updateCustomRecordSchema>;

export const customRecordQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});
export type CustomRecordQuery = z.infer<typeof customRecordQuerySchema>;

export interface CustomTableDto {
  id: string;
  tableKey: string;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomRecordDto {
  id: string;
  tableId: string;
  data: Record<string, unknown>;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomRecordListResponse {
  items: CustomRecordDto[];
  total: number;
  hasMore: boolean;
}

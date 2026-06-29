import { z } from "zod";
import { candidateQueryParamsSchema } from "./view.schema";

export const EXPORT_FORMATS = ["xlsx", "csv"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const exportCandidatesQuerySchema = candidateQueryParamsSchema
  .omit({ offset: true, limit: true })
  .extend({
    format: z.enum(EXPORT_FORMATS).optional(),
    fields: z
      .string()
      .optional()
      .transform((raw) => (raw ? raw.split(",").filter(Boolean) : undefined)),
    /** Khi có — chỉ xuất đúng các id này (export theo lô từ Bulk Actions), bỏ qua filters/search/sorts. */
    ids: z
      .string()
      .optional()
      .transform((raw) => (raw ? raw.split(",").filter(Boolean) : undefined)),
  });
export type ExportCandidatesQuery = z.infer<typeof exportCandidatesQuerySchema>;

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportCandidatesResult {
  createdCount: number;
  errorCount: number;
  errors: ImportRowError[];
}

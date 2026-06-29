import { z } from "zod";

export const createRecordLinkSchema = z.object({
  toRecordId: z.string().uuid(),
});
export type CreateRecordLinkInput = z.infer<typeof createRecordLinkSchema>;

export interface RecordLinkItemDto {
  id: string;
  label: string;
}

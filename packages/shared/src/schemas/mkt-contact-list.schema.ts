import { z } from "zod";

export interface MktContactListDto {
  id: string;
  name: string;
  description: string | null;
  color: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
}

export const createMktContactListSchema = z.object({
  name: z.string().min(1, "Tên không được để trống"),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default("#6366f1"),
});
export type CreateMktContactListInput = z.infer<typeof createMktContactListSchema>;

export const updateMktContactListSchema = createMktContactListSchema.partial();
export type UpdateMktContactListInput = z.infer<typeof updateMktContactListSchema>;

export const addContactToListSchema = z.object({
  contactId: z.string().uuid(),
});
export type AddContactToListInput = z.infer<typeof addContactToListSchema>;

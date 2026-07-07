import { z } from "zod";

export interface MktContactDto {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  source: string | null;
  notes: string | null;
  unsubscribed: boolean;
  candidateId: string | null;
  tags: { id: string; name: string; color: string }[];
  lists: { id: string; name: string; color: string }[];
  createdAt: string;
  updatedAt: string;
}

export const createMktContactSchema = z.object({
  fullName: z.string().min(1, "Tên không được để trống"),
  email: z.string().email("Email không hợp lệ"),
  phone: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  candidateId: z.string().uuid().optional(),
  tagIds: z.array(z.string().uuid()).optional().default([]),
  listIds: z.array(z.string().uuid()).optional().default([]),
});
export type CreateMktContactInput = z.infer<typeof createMktContactSchema>;

export const updateMktContactSchema = createMktContactSchema.partial();
export type UpdateMktContactInput = z.infer<typeof updateMktContactSchema>;

export const mktContactQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(50),
  search: z.string().optional(),
  listId: z.string().uuid().optional(),
  tagId: z.string().uuid().optional(),
  unsubscribed: z.coerce.boolean().optional(),
});
export type MktContactQuery = z.infer<typeof mktContactQuerySchema>;

export interface MktContactListResponse {
  data: MktContactDto[];
  total: number;
  page: number;
  limit: number;
}

export interface MktContactEventDto {
  id: string;
  contactId: string;
  eventType: string;
  meta: Record<string, unknown>;
  occurredAt: string;
}

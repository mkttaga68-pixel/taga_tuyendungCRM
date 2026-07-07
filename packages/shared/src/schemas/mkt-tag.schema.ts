import { z } from "zod";

export interface MktTagDto {
  id: string;
  name: string;
  slug: string;
  color: string;
  createdAt: string;
  contactCount: number;
}

export const createMktTagSchema = z.object({
  name: z.string().min(1, "Tên không được để trống"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default("#8b5cf6"),
});
export type CreateMktTagInput = z.infer<typeof createMktTagSchema>;

export const updateMktTagSchema = createMktTagSchema.partial();
export type UpdateMktTagInput = z.infer<typeof updateMktTagSchema>;

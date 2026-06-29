import { z } from "zod";

export const createCommentSchema = z.object({
  entityTable: z.string().min(1).max(64),
  entityId: z.string().uuid(),
  bodyText: z.string().min(1, "Nội dung không được để trống").max(5000),
  mentions: z.array(z.string().uuid()).optional(),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export interface CommentDto {
  id: string;
  entityTable: string;
  entityId: string;
  author: { id: string; fullName: string } | null;
  bodyText: string;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
}

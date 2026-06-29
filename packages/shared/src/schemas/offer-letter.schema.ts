import { z } from "zod";

export const createOfferLetterSchema = z.object({
  companyName: z.string().min(1).max(200).default("TAGA Global"),
  position: z.string().min(1, "Vị trí không được để trống").max(200),
  salary: z.string().min(1, "Mức lương không được để trống").max(100),
  startDate: z.string().date("Ngày bắt đầu không hợp lệ"),
  probationPeriod: z.string().max(100).optional(),
  workLocation: z.string().max(300).optional(),
  notes: z.string().max(2000).optional(),
});
export type CreateOfferLetterInput = z.infer<typeof createOfferLetterSchema>;

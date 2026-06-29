import { z } from "zod";
import { AD_SPEND_CHANNELS } from "../enums/report.enum";

export const createAdSpendSchema = z.object({
  landingPageId: z.string().uuid().optional(),
  channel: z.enum(AD_SPEND_CHANNELS),
  date: z.string().date("Ngày không hợp lệ"),
  amount: z.coerce.number().positive("Số tiền phải lớn hơn 0"),
  currency: z.string().min(1).max(10).default("VND"),
  source: z.string().min(1).max(50).default("MANUAL"),
});
export type CreateAdSpendInput = z.infer<typeof createAdSpendSchema>;

export const adSpendListQuerySchema = z.object({
  landingPageId: z.string().uuid().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
export type AdSpendListQuery = z.infer<typeof adSpendListQuerySchema>;

export interface AdSpendDto {
  id: string;
  landingPageId: string | null;
  landingPageName: string | null;
  channel: (typeof AD_SPEND_CHANNELS)[number];
  date: string;
  amount: number;
  currency: string;
  source: string;
  createdAt: string;
}

export interface AdSpendListResponse {
  items: AdSpendDto[];
  hasMore: boolean;
}

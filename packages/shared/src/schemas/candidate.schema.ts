import { z } from "zod";
import { GENDERS, CANDIDATE_SOURCES } from "../enums/candidate.enum";
import type { FilterCondition, SortCondition } from "./view.schema";

export const createCandidateSchema = z.object({
  fullName: z.string().min(1, "Tên không được để trống").max(200),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal("")),
  dob: z.string().date().optional(),
  gender: z.enum(GENDERS).optional(),
  address: z.string().max(500).optional(),
  areaBranch: z.string().max(200).optional(),
  facebookLink: z.string().url().optional().or(z.literal("")),
  note: z.string().max(5000).optional(),
  nextActionNote: z.string().max(500).optional(),
  source: z.enum(CANDIDATE_SOURCES).optional(),
  statusId: z.string().uuid().optional(),
  recruiterId: z.string().uuid().optional(),
  tags: z.array(z.string().max(50)).optional(),
});
export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;

/**
 * PATCH /candidates/:id nhận map { fieldKey: value } — dùng chung cho việc sửa 1 ô
 * (inline cell edit) hay nhiều field cùng lúc. fieldKey có thể là cột hệ thống
 * (fullName, statusId...) hoặc field tự thêm (lưu trong custom_fields) — service
 * tự tra field_definitions để biết cách ghi & coerce kiểu dữ liệu.
 */
export const updateCandidateFieldsSchema = z.record(z.string().min(1), z.unknown()).refine(
  (obj) => Object.keys(obj).length > 0,
  "Cần ít nhất 1 field để cập nhật",
);
export type UpdateCandidateFieldsInput = z.infer<typeof updateCandidateFieldsSchema>;

/**
 * offset/limit (không dùng cursor nữa) — cần thiết vì filter/sort/group có thể
 * nằm trên bất kỳ field (kể cả custom_fields JSONB), keyset cursor không áp
 * dụng được tổng quát cho sort tuỳ ý. Trade-off OFFSET sâu chậm hơn keyset chỉ
 * đáng kể ở offset rất lớn (>100k) — chấp nhận được cho 1 view đã filter/sort.
 */
export interface CandidateListQuery {
  offset?: number;
  limit?: number;
  search?: string;
  filters?: FilterCondition[];
  sorts?: SortCondition[];
  groupBy?: string | null;
}

export interface CandidateStatusRef {
  id: string;
  key: string;
  label: string;
  color: string;
}

export interface CandidateUserRef {
  id: string;
  fullName: string;
}

export interface CandidateLandingPageRef {
  id: string;
  name: string;
}

export interface CandidateDto {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  dob: string | null;
  gender: (typeof GENDERS)[number] | null;
  address: string | null;
  areaBranch: string | null;
  facebookLink: string | null;
  photoUrl: string | null;
  source: (typeof CANDIDATE_SOURCES)[number];
  note: string | null;
  nextActionNote: string | null;
  tags: string[];
  status: CandidateStatusRef;
  recruiter: CandidateUserRef | null;
  landingPage: CandidateLandingPageRef | null;
  firstUtmSource: string | null;
  firstUtmMedium: string | null;
  firstUtmCampaign: string | null;
  firstUtmContent: string | null;
  firstUtmTerm: string | null;
  firstIp: string | null;
  firstDevice: string | null;
  firstOs: string | null;
  firstBrowser: string | null;
  firstReferrer: string | null;
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateListResponse {
  items: CandidateDto[];
  hasMore: boolean;
}

/** Giới hạn số dòng/lần Bulk Action — khớp quy mô chọn tay trên UI, không phải quy mô triệu bản ghi của bảng. */
export const BULK_ACTION_MAX_IDS = 500;

const bulkIdsSchema = z.array(z.string().min(1)).min(1).max(BULK_ACTION_MAX_IDS);

export const bulkUpdateStatusSchema = z.object({
  ids: bulkIdsSchema,
  statusId: z.string().min(1),
});
export type BulkUpdateStatusInput = z.infer<typeof bulkUpdateStatusSchema>;

export const bulkUpdateRecruiterSchema = z.object({
  ids: bulkIdsSchema,
  recruiterId: z.string().min(1).nullable(),
});
export type BulkUpdateRecruiterInput = z.infer<typeof bulkUpdateRecruiterSchema>;

export const bulkDeleteCandidatesSchema = z.object({
  ids: bulkIdsSchema,
});
export type BulkDeleteCandidatesInput = z.infer<typeof bulkDeleteCandidatesSchema>;

export interface BulkActionResult {
  succeeded: string[];
  failed: { id: string; reason: string }[];
}

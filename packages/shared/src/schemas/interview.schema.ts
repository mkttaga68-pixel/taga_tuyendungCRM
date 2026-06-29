import { z } from "zod";
import { INTERVIEW_RESULTS } from "../enums/interview.enum";

export const createInterviewSchema = z.object({
  scheduledDate: z.string().date("Ngày phỏng vấn không hợp lệ"),
  scheduledTime: z.string().min(1, "Giờ phỏng vấn không được để trống").max(20),
  interviewerId: z.string().uuid().optional(),
  location: z.string().max(300).optional(),
  googleMeetLink: z.string().url().optional().or(z.literal("")),
  /** true: tự tạo Google Calendar event + Meet link qua tài khoản Google của Interviewer (cần đã connect). */
  createGoogleMeet: z.boolean().optional(),
  note: z.string().max(2000).optional(),
});
export type CreateInterviewInput = z.infer<typeof createInterviewSchema>;

export const updateInterviewSchema = z.object({
  scheduledDate: z.string().date().optional(),
  scheduledTime: z.string().min(1).max(20).optional(),
  interviewerId: z.string().uuid().optional().nullable(),
  location: z.string().max(300).optional(),
  googleMeetLink: z.string().url().optional().or(z.literal("")),
  createGoogleMeet: z.boolean().optional(),
  note: z.string().max(2000).optional(),
  result: z.enum(INTERVIEW_RESULTS).optional(),
});
export type UpdateInterviewInput = z.infer<typeof updateInterviewSchema>;

export const interviewListQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  result: z.enum(INTERVIEW_RESULTS).optional(),
});
export type InterviewListQuery = z.infer<typeof interviewListQuerySchema>;

export interface InterviewDto {
  id: string;
  candidateId: string;
  candidateName: string;
  round: number;
  scheduledDate: string;
  scheduledTime: string;
  interviewer: { id: string; fullName: string } | null;
  location: string | null;
  googleMeetLink: string | null;
  googleCalendarEventId: string | null;
  note: string | null;
  result: (typeof INTERVIEW_RESULTS)[number];
  createdAt: string;
  updatedAt: string;
}

export interface InterviewListResponse {
  items: InterviewDto[];
  hasMore: boolean;
}

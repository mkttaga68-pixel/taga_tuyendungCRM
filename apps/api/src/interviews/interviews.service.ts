import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, type Interview } from "@prisma/client";
import {
  ROLES_WITH_FULL_VISIBILITY,
  buildVnDateTimeRange,
  type AccessTokenPayload,
  type CreateInterviewInput,
  type InterviewDto,
  type InterviewListQuery,
  type InterviewListResponse,
  type UpdateInterviewInput,
} from "@taga-crm/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CandidatesService } from "../candidates/candidates.service";
import { GoogleCalendarService } from "../integrations/google/google-calendar.service";

const DEFAULT_INTERVIEW_DURATION_MINUTES = 60;

const INTERVIEW_INCLUDE = {
  candidate: { select: { id: true, fullName: true } },
  interviewer: { select: { id: true, fullName: true } },
} satisfies Prisma.InterviewInclude;

type InterviewWithRelations = Interview & {
  candidate: { id: string; fullName: string };
  interviewer: { id: string; fullName: string } | null;
};

@Injectable()
export class InterviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly candidatesService: CandidatesService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  async list(
    viewer: AccessTokenPayload,
    query: InterviewListQuery,
  ): Promise<InterviewListResponse> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const offset = Math.max(query.offset ?? 0, 0);

    const where: Prisma.InterviewWhereInput = {
      ...(query.result ? { result: query.result } : {}),
      ...(!ROLES_WITH_FULL_VISIBILITY.has(viewer.role)
        ? viewer.role === "INTERVIEWER"
          ? { interviewerId: viewer.sub }
          : { candidate: { recruiterId: viewer.sub } }
        : {}),
    };

    const rows = await this.prisma.interview.findMany({
      where,
      include: INTERVIEW_INCLUDE,
      orderBy: [{ scheduledDate: "desc" }, { scheduledTime: "desc" }],
      take: limit + 1,
      skip: offset,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return { items: page.map((row) => this.toDto(row)), hasMore };
  }

  async listForCandidate(viewer: AccessTokenPayload, candidateId: string): Promise<InterviewDto[]> {
    await this.candidatesService.assertCandidateVisible(viewer, candidateId);
    const rows = await this.prisma.interview.findMany({
      where: { candidateId },
      include: INTERVIEW_INCLUDE,
      orderBy: { round: "asc" },
    });
    return rows.map((row) => this.toDto(row));
  }

  async create(
    viewer: AccessTokenPayload,
    candidateId: string,
    input: CreateInterviewInput,
  ): Promise<InterviewDto> {
    const candidate = await this.candidatesService.assertCandidateVisible(viewer, candidateId, {
      forWrite: true,
    });

    const lastRound = await this.prisma.interview.findFirst({
      where: { candidateId },
      orderBy: { round: "desc" },
      select: { round: true },
    });
    const round = (lastRound?.round ?? 0) + 1;

    let googleMeetLink = input.googleMeetLink || null;
    let googleCalendarEventId: string | null = null;
    if (input.createGoogleMeet) {
      const generated = await this.createGoogleMeetEvent(
        {
          interviewerId: input.interviewerId ?? null,
          scheduledDate: input.scheduledDate,
          scheduledTime: input.scheduledTime,
        },
        candidate.fullName,
        round,
      );
      googleMeetLink = generated.meetLink;
      googleCalendarEventId = generated.eventId;
    }

    const created = await this.prisma.interview.create({
      data: {
        candidateId,
        round,
        scheduledDate: new Date(input.scheduledDate),
        scheduledTime: input.scheduledTime,
        interviewerId: input.interviewerId,
        location: input.location || null,
        googleMeetLink,
        googleCalendarEventId,
        note: input.note || null,
      },
      include: INTERVIEW_INCLUDE,
    });

    return this.toDto(created);
  }

  async update(
    viewer: AccessTokenPayload,
    id: string,
    input: UpdateInterviewInput,
  ): Promise<InterviewDto> {
    const existing = await this.getOrThrow(id);
    await this.candidatesService.assertCandidateVisible(viewer, existing.candidateId, {
      forWrite: true,
    });

    if (viewer.role === "INTERVIEWER" && existing.interviewerId !== viewer.sub) {
      throw new ForbiddenException("Bạn chỉ sửa được lịch phỏng vấn được gán cho mình");
    }

    let googleMeetLink =
      input.googleMeetLink !== undefined ? input.googleMeetLink || null : existing.googleMeetLink;
    let googleCalendarEventId = existing.googleCalendarEventId;

    if (input.createGoogleMeet) {
      const effectiveInterviewerId =
        input.interviewerId !== undefined ? input.interviewerId : existing.interviewerId;
      const effectiveDate =
        input.scheduledDate ?? existing.scheduledDate.toISOString().slice(0, 10);
      const effectiveTime = input.scheduledTime ?? existing.scheduledTime;
      const generated = await this.createGoogleMeetEvent(
        {
          interviewerId: effectiveInterviewerId ?? null,
          scheduledDate: effectiveDate,
          scheduledTime: effectiveTime,
        },
        existing.candidate.fullName,
        existing.round,
      );
      googleMeetLink = generated.meetLink;
      googleCalendarEventId = generated.eventId;
    }

    const updated = await this.prisma.interview.update({
      where: { id },
      data: {
        ...(input.scheduledDate !== undefined
          ? { scheduledDate: new Date(input.scheduledDate) }
          : {}),
        ...(input.scheduledTime !== undefined ? { scheduledTime: input.scheduledTime } : {}),
        ...(input.interviewerId !== undefined
          ? {
              interviewer: input.interviewerId
                ? { connect: { id: input.interviewerId } }
                : { disconnect: true },
            }
          : {}),
        ...(input.location !== undefined ? { location: input.location || null } : {}),
        googleMeetLink,
        googleCalendarEventId,
        ...(input.note !== undefined ? { note: input.note || null } : {}),
        ...(input.result !== undefined ? { result: input.result } : {}),
      },
      include: INTERVIEW_INCLUDE,
    });

    return this.toDto(updated);
  }

  async remove(viewer: AccessTokenPayload, id: string): Promise<{ success: true }> {
    const existing = await this.getOrThrow(id);
    await this.candidatesService.assertCandidateVisible(viewer, existing.candidateId, {
      forWrite: true,
    });
    if (existing.googleCalendarEventId && existing.interviewerId) {
      await this.googleCalendarService.deleteInterviewEventBestEffort(
        existing.interviewerId,
        existing.googleCalendarEventId,
      );
    }
    await this.prisma.interview.delete({ where: { id } });
    return { success: true };
  }

  /** interviewerId là chủ calendar được dùng để tạo event — Meet được gắn vào lịch người phỏng vấn, không phải Recruiter. */
  private async createGoogleMeetEvent(
    input: { interviewerId: string | null; scheduledDate: string; scheduledTime: string },
    candidateFullName: string,
    round: number,
  ): Promise<{ meetLink: string | null; eventId: string | null }> {
    if (!input.interviewerId) {
      throw new BadRequestException(
        "Cần chọn Người phỏng vấn trước khi tạo Google Meet (Meet được tạo trên lịch của Interviewer)",
      );
    }
    let timeRange: { startDateTime: string; endDateTime: string };
    try {
      timeRange = buildVnDateTimeRange(
        input.scheduledDate,
        input.scheduledTime,
        DEFAULT_INTERVIEW_DURATION_MINUTES,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định";
      throw new BadRequestException(message);
    }
    const event = await this.googleCalendarService.createInterviewEvent(input.interviewerId, {
      summary: `Phỏng vấn ${candidateFullName} — Vòng ${round}`,
      startDateTime: timeRange.startDateTime,
      endDateTime: timeRange.endDateTime,
    });
    return { meetLink: event.meetLink, eventId: event.eventId };
  }

  private async getOrThrow(id: string): Promise<Interview & { candidate: { fullName: string } }> {
    const row = await this.prisma.interview.findUnique({
      where: { id },
      include: { candidate: { select: { fullName: true } } },
    });
    if (!row) throw new NotFoundException("Không tìm thấy lịch phỏng vấn");
    return row;
  }

  private toDto(row: InterviewWithRelations): InterviewDto {
    return {
      id: row.id,
      candidateId: row.candidateId,
      candidateName: row.candidate.fullName,
      round: row.round,
      scheduledDate: row.scheduledDate.toISOString().slice(0, 10),
      scheduledTime: row.scheduledTime,
      interviewer: row.interviewer,
      location: row.location,
      googleMeetLink: row.googleMeetLink,
      googleCalendarEventId: row.googleCalendarEventId,
      note: row.note,
      result: row.result,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

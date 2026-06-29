import { BadRequestException, Injectable } from "@nestjs/common";
import {
  checkGoogleFreeBusy,
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  type CreateGoogleCalendarEventResult,
  type GoogleFreeBusyRange,
} from "@taga-crm/shared";
import { GoogleTokenService } from "./google-token.service";

export interface CreateInterviewEventInput {
  summary: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  attendeeEmails?: string[];
}

@Injectable()
export class GoogleCalendarService {
  constructor(private readonly tokenService: GoogleTokenService) {}

  async createInterviewEvent(
    ownerUserId: string,
    input: CreateInterviewEventInput,
  ): Promise<CreateGoogleCalendarEventResult> {
    const accessToken = await this.tokenService.getValidAccessToken(ownerUserId);
    try {
      return await createGoogleCalendarEvent({
        accessToken,
        summary: input.summary,
        description: input.description,
        startDateTime: input.startDateTime,
        endDateTime: input.endDateTime,
        attendeeEmails: input.attendeeEmails,
        withMeet: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định";
      throw new BadRequestException(`Tạo Google Calendar event thất bại: ${message}`);
    }
  }

  /** Best-effort — gọi khi xoá/hủy lịch phỏng vấn, không throw để không chặn việc xoá record chính. */
  async deleteInterviewEventBestEffort(ownerUserId: string, eventId: string): Promise<void> {
    try {
      const accessToken = await this.tokenService.getValidAccessToken(ownerUserId);
      await deleteGoogleCalendarEvent(accessToken, eventId);
    } catch {
      // Bỏ qua: event Google có thể đã bị xoá tay, hoặc user đã disconnect Google — không phải lỗi nghiêm trọng.
    }
  }

  async checkConflict(
    ownerUserId: string,
    startDateTime: string,
    endDateTime: string,
  ): Promise<GoogleFreeBusyRange[]> {
    const accessToken = await this.tokenService.getValidAccessToken(ownerUserId);
    try {
      return await checkGoogleFreeBusy(accessToken, startDateTime, endDateTime);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định";
      throw new BadRequestException(`Kiểm tra lịch trống Google Calendar thất bại: ${message}`);
    }
  }
}

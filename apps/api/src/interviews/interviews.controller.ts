import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  createInterviewSchema,
  interviewListQuerySchema,
  updateInterviewSchema,
  type AccessTokenPayload,
  type CreateInterviewInput,
  type InterviewListQuery,
  type UpdateInterviewInput,
} from "@taga-crm/shared";
import { InterviewsService } from "./interviews.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("interviews")
@UseGuards(JwtAuthGuard, RolesGuard)
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get()
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query(new ZodValidationPipe(interviewListQuerySchema)) query: InterviewListQuery,
  ) {
    return this.interviewsService.list(user, query);
  }

  @Patch(":id")
  @Roles("ADMIN", "HR_MANAGER", "RECRUITER", "INTERVIEWER")
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateInterviewSchema)) body: UpdateInterviewInput,
  ) {
    return this.interviewsService.update(user, id, body);
  }

  @Delete(":id")
  @Roles("ADMIN", "HR_MANAGER", "RECRUITER")
  remove(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string) {
    return this.interviewsService.remove(user, id);
  }
}

@Controller("candidates/:candidateId/interviews")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CandidateInterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get()
  listForCandidate(
    @CurrentUser() user: AccessTokenPayload,
    @Param("candidateId") candidateId: string,
  ) {
    return this.interviewsService.listForCandidate(user, candidateId);
  }

  @Post()
  @Roles("ADMIN", "HR_MANAGER", "RECRUITER")
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Param("candidateId") candidateId: string,
    @Body(new ZodValidationPipe(createInterviewSchema)) body: CreateInterviewInput,
  ) {
    return this.interviewsService.create(user, candidateId, body);
  }
}

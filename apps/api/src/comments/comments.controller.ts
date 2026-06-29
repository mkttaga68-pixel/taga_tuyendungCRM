import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import {
  createCommentSchema,
  type AccessTokenPayload,
  type CreateCommentInput,
} from "@taga-crm/shared";
import { CommentsService } from "./comments.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("comments")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  list(
    @CurrentUser() user: AccessTokenPayload,
    @Query("entityTable") entityTable: string,
    @Query("entityId") entityId: string,
  ) {
    return this.commentsService.list(user, entityTable, entityId);
  }

  @Post()
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(createCommentSchema)) body: CreateCommentInput,
  ) {
    return this.commentsService.create(user, body);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string) {
    return this.commentsService.remove(user, id);
  }
}

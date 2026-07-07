import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  createMktTagSchema,
  updateMktTagSchema,
  type CreateMktTagInput,
  type UpdateMktTagInput,
} from "@taga-crm/shared";
import { MktTagsService } from "./mkt-tags.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";

@Controller("mkt/tags")
@UseGuards(JwtAuthGuard)
export class MktTagsController {
  constructor(private readonly service: MktTagsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body(new ZodValidationPipe(createMktTagSchema)) body: CreateMktTagInput) {
    return this.service.create(body);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateMktTagSchema)) body: UpdateMktTagInput,
  ) {
    return this.service.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}

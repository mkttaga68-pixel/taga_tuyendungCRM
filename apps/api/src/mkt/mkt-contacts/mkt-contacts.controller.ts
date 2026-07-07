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
  createMktContactSchema,
  updateMktContactSchema,
  mktContactQuerySchema,
  type CreateMktContactInput,
  type UpdateMktContactInput,
  type MktContactQuery,
} from "@taga-crm/shared";
import { MktContactsService } from "./mkt-contacts.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";

@Controller("mkt/contacts")
@UseGuards(JwtAuthGuard)
export class MktContactsController {
  constructor(private readonly service: MktContactsService) {}

  @Get()
  list(@Query(new ZodValidationPipe(mktContactQuerySchema)) query: MktContactQuery) {
    return this.service.list(query);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Get(":id/timeline")
  getTimeline(@Param("id") id: string) {
    return this.service.getTimeline(id);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createMktContactSchema)) body: CreateMktContactInput) {
    return this.service.create(body);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateMktContactSchema)) body: UpdateMktContactInput,
  ) {
    return this.service.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}

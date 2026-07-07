import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  createMktContactListSchema,
  updateMktContactListSchema,
  addContactToListSchema,
  type CreateMktContactListInput,
  type UpdateMktContactListInput,
  type AddContactToListInput,
  type AccessTokenPayload,
} from "@taga-crm/shared";
import { MktContactListsService } from "./mkt-contact-lists.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@Controller("mkt/contact-lists")
@UseGuards(JwtAuthGuard)
export class MktContactListsController {
  constructor(private readonly service: MktContactListsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createMktContactListSchema)) body: CreateMktContactListInput,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.service.create(body, user);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateMktContactListSchema)) body: UpdateMktContactListInput,
  ) {
    return this.service.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }

  @Post(":id/contacts")
  addContact(
    @Param("id") listId: string,
    @Body(new ZodValidationPipe(addContactToListSchema)) body: AddContactToListInput,
  ) {
    return this.service.addContact(listId, body.contactId);
  }

  @Delete(":id/contacts/:contactId")
  removeContact(@Param("id") listId: string, @Param("contactId") contactId: string) {
    return this.service.removeContact(listId, contactId);
  }
}

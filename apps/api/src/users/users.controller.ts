import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type AccessTokenPayload,
} from "@taga-crm/shared";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles("ADMIN")
  create(@Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput) {
    return this.usersService.create(body);
  }

  @Get()
  @Roles("ADMIN", "HR_MANAGER")
  findAll() {
    return this.usersService.findAll();
  }

  @Get("lookup")
  lookup() {
    return this.usersService.lookupActiveUsers();
  }

  @Get(":id")
  @Roles("ADMIN", "HR_MANAGER")
  findOne(@Param("id") id: string) {
    return this.usersService.findById(id);
  }

  @Patch(":id")
  @Roles("ADMIN")
  update(
    @CurrentUser() actor: AccessTokenPayload,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserInput,
  ) {
    return this.usersService.update(actor.sub, id, body);
  }

  @Delete(":id")
  @Roles("ADMIN")
  remove(@CurrentUser() actor: AccessTokenPayload, @Param("id") id: string) {
    return this.usersService.softDelete(actor.sub, id);
  }
}

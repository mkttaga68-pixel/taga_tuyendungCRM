import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import type { CreateUserInput, UpdateUserInput } from "@taga-crm/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateUserInput) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException("Email đã được sử dụng");
    }

    const passwordHash = await argon2.hash(input.password);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        role: input.role,
        phone: input.phone,
      },
    });

    return this.sanitize(user);
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return users.map((user) => this.sanitize(user));
  }

  /** Danh sách rút gọn cho mọi role đã đăng nhập — dùng để chọn "Recruiter phụ trách" trên Grid. */
  async lookupActiveUsers() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, fullName: true, role: true },
      orderBy: { fullName: "asc" },
    });
    return users;
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) {
      throw new NotFoundException("Không tìm thấy người dùng");
    }
    return this.sanitize(user);
  }

  async update(actorId: string, id: string, input: UpdateUserInput) {
    await this.findById(id);

    if (actorId === id && (input.isActive === false || (input.role && input.role !== "ADMIN"))) {
      throw new BadRequestException("Không thể tự khoá hoặc tự hạ quyền tài khoản của chính mình");
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: input.fullName,
        role: input.role,
        phone: input.phone,
        isActive: input.isActive,
      },
    });
    return this.sanitize(user);
  }

  async softDelete(actorId: string, id: string) {
    if (actorId === id) {
      throw new BadRequestException("Không thể xoá tài khoản của chính mình");
    }
    await this.findById(id);
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { success: true };
  }

  private sanitize<T extends { passwordHash: string }>(user: T) {
    const { passwordHash: _passwordHash, ...rest } = user;
    return rest;
  }
}

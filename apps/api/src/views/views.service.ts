import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, type View } from "@prisma/client";
import type {
  AccessTokenPayload,
  ColorRule,
  CreateViewInput,
  FilterCondition,
  SortCondition,
  UpdateViewInput,
  ViewDto,
} from "@taga-crm/shared";
import { PrismaService } from "../prisma/prisma.service";

const VIEW_MANAGER_ROLES = new Set(["ADMIN", "HR_MANAGER"]);

@Injectable()
export class ViewsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForTable(tableKey: string, viewer: AccessTokenPayload): Promise<ViewDto[]> {
    const views = await this.prisma.view.findMany({
      where: { tableKey, OR: [{ ownerId: null }, { ownerId: viewer.sub }] },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    if (views.length === 0) {
      const seeded = await this.ensureDefaultView(tableKey);
      return [this.toDto(seeded)];
    }
    return views.map((v) => this.toDto(v));
  }

  async create(
    tableKey: string,
    input: Omit<CreateViewInput, "tableKey">,
    actor: AccessTokenPayload,
  ): Promise<ViewDto> {
    const isShared = input.isShared ?? false;
    if (isShared && !VIEW_MANAGER_ROLES.has(actor.role)) {
      throw new ForbiddenException("Chỉ Admin/HR Manager mới tạo được view chia sẻ chung");
    }

    const created = await this.prisma.view.create({
      data: {
        tableKey,
        name: input.name,
        type: input.type ?? "GRID",
        ownerId: isShared ? null : actor.sub,
        filters: (input.filters ?? []) as unknown as Prisma.InputJsonValue,
        sorts: input.sorts ?? [],
        groupBy: input.groupBy ?? Prisma.JsonNull,
        hiddenFields: input.hiddenFields ?? [],
        frozenFieldCount: input.frozenFieldCount ?? 1,
        rowHeight: input.rowHeight ?? "SHORT",
        colorRules: (input.colorRules ?? []) as unknown as Prisma.InputJsonValue,
      },
    });
    return this.toDto(created);
  }

  async update(id: string, input: UpdateViewInput, actor: AccessTokenPayload): Promise<ViewDto> {
    const view = await this.ensureExists(id);
    this.assertCanMutate(view, actor);

    if (input.isShared !== undefined && !VIEW_MANAGER_ROLES.has(actor.role)) {
      throw new ForbiddenException("Chỉ Admin/HR Manager mới đổi được phạm vi chia sẻ view");
    }

    const data: Prisma.ViewUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.type !== undefined) data.type = input.type;
    if (input.isShared !== undefined) {
      data.owner = input.isShared ? { disconnect: true } : { connect: { id: actor.sub } };
    }
    if (input.filters !== undefined)
      data.filters = input.filters as unknown as Prisma.InputJsonValue;
    if (input.sorts !== undefined) data.sorts = input.sorts;
    if (input.groupBy !== undefined) data.groupBy = input.groupBy ?? Prisma.JsonNull;
    if (input.hiddenFields !== undefined) data.hiddenFields = input.hiddenFields;
    if (input.frozenFieldCount !== undefined) data.frozenFieldCount = input.frozenFieldCount;
    if (input.rowHeight !== undefined) data.rowHeight = input.rowHeight;
    if (input.colorRules !== undefined)
      data.colorRules = input.colorRules as unknown as Prisma.InputJsonValue;

    const updated = await this.prisma.view.update({ where: { id }, data });
    return this.toDto(updated);
  }

  async remove(id: string, actor: AccessTokenPayload): Promise<{ success: true }> {
    const view = await this.ensureExists(id);
    this.assertCanMutate(view, actor);
    if (view.isDefault) {
      throw new BadRequestException("Không thể xoá view mặc định");
    }
    await this.prisma.view.delete({ where: { id } });
    return { success: true };
  }

  async setDefault(id: string, actor: AccessTokenPayload): Promise<ViewDto> {
    if (!VIEW_MANAGER_ROLES.has(actor.role)) {
      throw new ForbiddenException("Chỉ Admin/HR Manager mới đổi được view mặc định");
    }
    const view = await this.ensureExists(id);

    const [, updated] = await this.prisma.$transaction([
      this.prisma.view.updateMany({
        where: { tableKey: view.tableKey, isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.view.update({ where: { id }, data: { isDefault: true } }),
    ]);
    return this.toDto(updated);
  }

  private assertCanMutate(view: View, actor: AccessTokenPayload): void {
    const isOwner = view.ownerId === actor.sub;
    const isManager = VIEW_MANAGER_ROLES.has(actor.role);
    if (view.ownerId === null && !isManager) {
      throw new ForbiddenException("Chỉ Admin/HR Manager mới sửa được view chia sẻ chung");
    }
    if (view.ownerId !== null && !isOwner && !isManager) {
      throw new ForbiddenException("Bạn không có quyền sửa view này");
    }
  }

  private async ensureExists(id: string): Promise<View> {
    const view = await this.prisma.view.findUnique({ where: { id } });
    if (!view) throw new NotFoundException("Không tìm thấy view");
    return view;
  }

  /** Tạo view "Lưới" mặc định nếu bảng chưa từng có view nào (vd lần đầu seed/migrate). */
  private async ensureDefaultView(tableKey: string): Promise<View> {
    const existing = await this.prisma.view.findFirst({ where: { tableKey, isDefault: true } });
    if (existing) return existing;
    return this.prisma.view.create({
      data: { tableKey, name: "Lưới", type: "GRID", isDefault: true, ownerId: null },
    });
  }

  private toDto(view: View): ViewDto {
    return {
      id: view.id,
      tableKey: view.tableKey,
      name: view.name,
      type: view.type,
      isDefault: view.isDefault,
      ownerId: view.ownerId,
      filters: (view.filters as unknown as FilterCondition[]) ?? [],
      sorts: (view.sorts as unknown as SortCondition[]) ?? [],
      groupBy: (view.groupBy as string | null) ?? null,
      hiddenFields: (view.hiddenFields as unknown as string[]) ?? [],
      frozenFieldCount: view.frozenFieldCount,
      rowHeight: view.rowHeight as ViewDto["rowHeight"],
      colorRules: (view.colorRules as unknown as ColorRule[]) ?? [],
      createdAt: view.createdAt.toISOString(),
      updatedAt: view.updatedAt.toISOString(),
    };
  }
}

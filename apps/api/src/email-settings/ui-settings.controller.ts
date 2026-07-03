import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { PrismaService } from "../prisma/prisma.service";

const patchUiSettingsSchema = z.object({
  candidatesTableName: z.string().min(1).max(100).optional(),
});
type PatchUiSettingsInput = z.infer<typeof patchUiSettingsSchema>;

const KEY_CANDIDATES_NAME = "ui.candidates.name";

@Controller("settings/ui")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UiSettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get() {
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { in: [KEY_CANDIDATES_NAME] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      candidatesTableName: (map[KEY_CANDIDATES_NAME] as string | undefined) ?? "Ứng viên",
    };
  }

  @Patch()
  @Roles("ADMIN", "HR_MANAGER")
  async patch(@Body(new ZodValidationPipe(patchUiSettingsSchema)) body: PatchUiSettingsInput) {
    if (body.candidatesTableName !== undefined) {
      await this.prisma.systemSetting.upsert({
        where: { key: KEY_CANDIDATES_NAME },
        create: { key: KEY_CANDIDATES_NAME, value: body.candidatesTableName },
        update: { value: body.candidatesTableName },
      });
    }
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { in: [KEY_CANDIDATES_NAME] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      candidatesTableName: (map[KEY_CANDIDATES_NAME] as string | undefined) ?? "Ứng viên",
    };
  }
}

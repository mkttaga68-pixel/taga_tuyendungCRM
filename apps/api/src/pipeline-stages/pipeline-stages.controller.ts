import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";

@Controller("pipeline-stages")
@UseGuards(JwtAuthGuard)
export class PipelineStagesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll() {
    return this.prisma.pipelineStage.findMany({ orderBy: { sortOrder: "asc" } });
  }
}

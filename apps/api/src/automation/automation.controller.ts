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
  automationRunListQuerySchema,
  createWorkflowSchema,
  saveWorkflowGraphSchema,
  testRunSchema,
  updateWorkflowSchema,
  type AccessTokenPayload,
  type AutomationRunListQuery,
  type CreateWorkflowInput,
  type SaveWorkflowGraphInput,
  type TestRunInput,
  type UpdateWorkflowInput,
} from "@taga-crm/shared";
import { AutomationWorkflowsService } from "./automation-workflows.service";
import { AutomationRunsService } from "./automation-runs.service";
import { AutomationQueueService } from "./automation-queue.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("automation/workflows")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "HR_MANAGER")
export class AutomationController {
  constructor(
    private readonly workflowsService: AutomationWorkflowsService,
    private readonly runsService: AutomationRunsService,
    private readonly queueService: AutomationQueueService,
  ) {}

  @Get()
  list() {
    return this.workflowsService.list();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.workflowsService.findOne(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createWorkflowSchema)) body: CreateWorkflowInput,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.workflowsService.create(body, user);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateWorkflowSchema)) body: UpdateWorkflowInput,
  ) {
    return this.workflowsService.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.workflowsService.remove(id);
  }

  @Get(":id/graph")
  getGraph(@Param("id") id: string) {
    return this.workflowsService.getGraph(id);
  }

  @Post(":id/graph")
  saveGraph(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(saveWorkflowGraphSchema)) body: SaveWorkflowGraphInput,
  ) {
    return this.workflowsService.saveGraph(id, body);
  }

  @Get(":id/runs")
  listRuns(
    @Param("id") id: string,
    @Query(new ZodValidationPipe(automationRunListQuerySchema)) query: AutomationRunListQuery,
  ) {
    return this.runsService.list(id, query.offset ?? 0, query.limit ?? 20);
  }

  @Post(":id/test-run")
  testRun(@Param("id") id: string, @Body(new ZodValidationPipe(testRunSchema)) body: TestRunInput) {
    return this.queueService.triggerManualRun(id, body.candidateId);
  }
}

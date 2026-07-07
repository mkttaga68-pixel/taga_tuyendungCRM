import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, type Candidate, type FieldDefinition } from "@prisma/client";
import {
  ROLES_WITH_FULL_VISIBILITY,
  type AccessTokenPayload,
  type BulkActionResult,
  type CandidateDto,
  type CandidateListQuery,
  type CandidateListResponse,
  type CandidateStageHistoryDto,
  type CreateCandidateInput,
  type ExportCandidatesQuery,
  type ExportFormat,
  type FieldDefinitionDto,
  type ImportCandidatesResult,
  type ImportRowError,
} from "@taga-crm/shared";
import { PrismaService } from "../prisma/prisma.service";
import {
  buildCandidateFilterSql,
  buildCandidateGroupBySql,
  buildCandidateOrderBySql,
  buildCandidateSearchSql,
} from "./candidates-query.util";
import { buildCandidatesExportBuffer } from "./candidates-export.util";
import { parseImportFile } from "./candidates-import.util";
import { AuditLogService, type AuditChangeInput } from "../audit-log/audit-log.service";
import { AutomationQueueService } from "../automation/automation-queue.service";
import { ComputeFieldsService } from "./compute-fields.service";

const ENTITY_TABLE = "candidates";

const EXPORT_ROW_CAP = 20_000;
const IMPORT_CORE_FIELD_KEYS = new Set([
  "fullName",
  "phone",
  "email",
  "dob",
  "gender",
  "address",
  "areaBranch",
  "facebookLink",
  "note",
  "nextActionNote",
  "source",
  "statusId",
  "recruiterId",
  "tags",
]);

const CANDIDATE_INCLUDE = {
  status: { select: { id: true, key: true, label: true, color: true } },
  recruiter: { select: { id: true, fullName: true } },
  landingPage: { select: { id: true, name: true } },
  emailLogs: {
    where: { status: "SENT" },
    select: { subject: true, sentAt: true },
    orderBy: { sentAt: "desc" },
    take: 1,
  },
} satisfies Prisma.CandidateInclude;

type CandidateWithRelations = Candidate & {
  status: { id: string; key: string; label: string; color: string };
  recruiter: { id: string; fullName: string } | null;
  landingPage: { id: string; name: string } | null;
  emailLogs: { subject: string; sentAt: Date | null }[];
};

/** Field tracking do pipeline ingestion (Sprint 3) ghi — không cho sửa tay qua PATCH. */
const READONLY_SYSTEM_FIELD_KEYS = new Set([
  "createdAt",
  "updatedAt",
  "firstUtmSource",
  "firstUtmMedium",
  "firstUtmCampaign",
  "firstUtmContent",
  "firstUtmTerm",
  "firstIp",
  "firstDevice",
  "firstOs",
  "firstBrowser",
  "firstReferrer",
]);

const PLAIN_TEXT_FIELD_KEYS = new Set([
  "fullName",
  "phone",
  "email",
  "address",
  "areaBranch",
  "facebookLink",
  "photoUrl",
  "note",
  "nextActionNote",
]);

@Injectable()
export class CandidatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly automationQueueService: AutomationQueueService,
    private readonly computeFieldsService: ComputeFieldsService,
  ) {}

  async list(
    viewer: AccessTokenPayload,
    query: CandidateListQuery,
  ): Promise<CandidateListResponse> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const offset = Math.max(query.offset ?? 0, 0);
    const fieldDefMap = await this.loadFieldDefMap();
    const whereSql = this.buildWhereSql(viewer, query, fieldDefMap);
    const orderBySql = this.buildOrderBySql(query, fieldDefMap);

    const idRows = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id FROM candidates
      WHERE ${whereSql}
      ORDER BY ${orderBySql}
      LIMIT ${limit + 1} OFFSET ${offset}
    `);

    const hasMore = idRows.length > limit;
    const pageIds = (hasMore ? idRows.slice(0, limit) : idRows).map((r) => r.id);
    const ordered = await this.fetchOrderedByIds(pageIds);
    const computed = await this.computeFieldsService.computeForRows(
      ordered,
      Array.from(fieldDefMap.values()),
    );

    return {
      items: ordered.map((row) => this.toDto(row, computed.get(row.id))),
      hasMore,
    };
  }

  async exportFile(
    viewer: AccessTokenPayload,
    query: ExportCandidatesQuery,
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string; truncated: boolean }> {
    const fieldDefMap = await this.loadFieldDefMap();
    const whereSql = this.buildWhereSql(viewer, query, fieldDefMap);
    const orderBySql = this.buildOrderBySql(query, fieldDefMap);

    const idRows = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id FROM candidates
      WHERE ${whereSql}
      ORDER BY ${orderBySql}
      LIMIT ${EXPORT_ROW_CAP + 1}
    `);
    const truncated = idRows.length > EXPORT_ROW_CAP;
    const pageIds = (truncated ? idRows.slice(0, EXPORT_ROW_CAP) : idRows).map((r) => r.id);
    const ordered = await this.fetchOrderedByIds(pageIds);
    const computed = await this.computeFieldsService.computeForRows(
      ordered,
      Array.from(fieldDefMap.values()),
    );
    const items = ordered.map((row) => this.toDto(row, computed.get(row.id)));

    const allFields = Array.from(fieldDefMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
    const selectedFields =
      query.fields && query.fields.length > 0
        ? allFields.filter((f) => query.fields!.includes(f.fieldKey))
        : allFields.filter((f) => !f.isHidden);
    const fieldDtos: FieldDefinitionDto[] = selectedFields.map((f) => this.fieldToDto(f));

    const format: ExportFormat = query.format ?? "xlsx";
    const buffer = await buildCandidatesExportBuffer(items, fieldDtos, format);
    const filename = `ung-vien-${new Date().toISOString().slice(0, 10)}.${format}`;
    const mimeType =
      format === "csv"
        ? "text/csv; charset=utf-8"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    return { buffer, filename, mimeType, truncated };
  }

  async importFile(
    actor: AccessTokenPayload,
    buffer: Buffer,
    mimeType: string,
  ): Promise<ImportCandidatesResult> {
    const fieldDefs = await this.prisma.fieldDefinition.findMany({
      where: { tableKey: "candidates" },
    });
    const writableFieldDefs = fieldDefs.filter((f) => !READONLY_SYSTEM_FIELD_KEYS.has(f.fieldKey));
    const pipelineStages = await this.prisma.pipelineStage.findMany();
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true },
    });

    const parsedRows = await parseImportFile(
      buffer,
      mimeType,
      writableFieldDefs,
      pipelineStages,
      users,
    );

    const errors: ImportRowError[] = [];
    let createdCount = 0;

    for (const row of parsedRows) {
      if (row.error) {
        errors.push({ row: row.rowNumber, message: row.error });
        continue;
      }
      const fullName = row.values.fullName;
      if (typeof fullName !== "string" || !fullName.trim()) {
        errors.push({ row: row.rowNumber, message: 'Thiếu "Tên" (bắt buộc)' });
        continue;
      }

      try {
        const corePayload: CreateCandidateInput = { fullName: fullName.trim() };
        for (const key of IMPORT_CORE_FIELD_KEYS) {
          if (key === "fullName") continue;
          const value = row.values[key];
          if (value !== undefined) {
            (corePayload as unknown as Record<string, unknown>)[key] = value;
          }
        }
        const created = await this.create(corePayload, actor);

        const customEntries = Object.entries(row.values).filter(
          ([key]) => !IMPORT_CORE_FIELD_KEYS.has(key),
        );
        if (customEntries.length > 0) {
          await this.updateFields(actor, created.id, Object.fromEntries(customEntries));
        }
        createdCount++;
      } catch (err) {
        errors.push({
          row: row.rowNumber,
          message: err instanceof Error ? err.message : "Lỗi không xác định",
        });
      }
    }

    return { createdCount, errorCount: errors.length, errors };
  }

  async count(viewer: AccessTokenPayload, query: CandidateListQuery): Promise<{ count: number }> {
    const fieldDefMap = await this.loadFieldDefMap();
    const whereSql = this.buildWhereSql(viewer, query, fieldDefMap);
    const rows = await this.prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT COUNT(*) as count FROM candidates WHERE ${whereSql}
    `);
    return { count: Number(rows[0]?.count ?? 0) };
  }

  private async loadFieldDefMap() {
    const fieldDefs = await this.prisma.fieldDefinition.findMany({
      where: { tableKey: "candidates" },
    });
    return new Map(fieldDefs.map((field) => [field.fieldKey, field]));
  }

  private buildWhereSql(
    viewer: AccessTokenPayload,
    query: CandidateListQuery & { ids?: string[] },
    fieldDefMap: Map<string, FieldDefinition>,
  ): Prisma.Sql {
    const parts: Prisma.Sql[] = [Prisma.sql`deleted_at IS NULL`];

    if (!ROLES_WITH_FULL_VISIBILITY.has(viewer.role)) {
      // Interviewer chỉ thấy candidate có lịch phỏng vấn gán cho mình — tách
      // riêng khỏi recruiter_id (đúng khoảng trống đã ghi nhận từ Sprint 0/1).
      if (viewer.role === "INTERVIEWER") {
        parts.push(
          Prisma.sql`id IN (SELECT candidate_id FROM interviews WHERE interviewer_id = ${viewer.sub}::uuid)`,
        );
      } else {
        parts.push(Prisma.sql`recruiter_id = ${viewer.sub}::uuid`);
      }
    }

    // Export theo lô (Bulk Actions) — giới hạn đúng các id đã chọn, vẫn giữ
    // scoping RBAC phía trên nên không thể export id ngoài phạm vi được xem.
    if (query.ids && query.ids.length > 0) {
      parts.push(
        Prisma.sql`id IN (${Prisma.join(query.ids.map((id) => Prisma.sql`${id}::uuid`))})`,
      );
    }

    if (query.search?.trim()) {
      parts.push(buildCandidateSearchSql(query.search.trim()));
    }

    for (const filter of query.filters ?? []) {
      parts.push(buildCandidateFilterSql(filter, fieldDefMap));
    }

    return Prisma.join(parts, " AND ");
  }

  private buildOrderBySql(
    query: Pick<CandidateListQuery, "sorts" | "groupBy">,
    fieldDefMap: Map<string, FieldDefinition>,
  ): Prisma.Sql {
    const orderParts: Prisma.Sql[] = [];
    const groupSql = buildCandidateGroupBySql(query.groupBy ?? undefined, fieldDefMap);
    if (groupSql) orderParts.push(groupSql);
    orderParts.push(buildCandidateOrderBySql(query.sorts ?? [], fieldDefMap));
    return Prisma.join(orderParts, ", ");
  }

  private async fetchOrderedByIds(ids: string[]): Promise<CandidateWithRelations[]> {
    const rows = await this.prisma.candidate.findMany({
      where: { id: { in: ids } },
      include: CANDIDATE_INCLUDE,
    });
    const rowsById = new Map(rows.map((r) => [r.id, r]));
    return ids.map((id) => rowsById.get(id)).filter((r): r is CandidateWithRelations => !!r);
  }

  private fieldToDto(field: FieldDefinition): FieldDefinitionDto {
    return {
      id: field.id,
      tableKey: field.tableKey,
      fieldKey: field.fieldKey,
      label: field.label,
      fieldType: field.fieldType,
      options: (field.options as Record<string, unknown> | null) ?? null,
      sortOrder: field.sortOrder,
      width: field.width,
      isFrozen: field.isFrozen,
      isHidden: field.isHidden,
      isRequired: field.isRequired,
      isSystem: field.isSystem,
    };
  }

  async findOne(viewer: AccessTokenPayload, id: string): Promise<CandidateDto> {
    const candidate = await this.getVisibleOrThrow(viewer, id);
    const fieldDefMap = await this.loadFieldDefMap();
    const computed = await this.computeFieldsService.computeForRows(
      [candidate],
      Array.from(fieldDefMap.values()),
    );
    return this.toDto(candidate, computed.get(candidate.id));
  }

  async getStageHistory(
    viewer: AccessTokenPayload,
    id: string,
  ): Promise<CandidateStageHistoryDto[]> {
    await this.getVisibleOrThrow(viewer, id);
    const rows = await this.prisma.candidateStageHistory.findMany({
      where: { candidateId: id },
      include: {
        fromStage: { select: { id: true, label: true, color: true } },
        toStage: { select: { id: true, label: true, color: true } },
        changedByUser: { select: { id: true, fullName: true } },
      },
      orderBy: { changedAt: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      candidateId: row.candidateId,
      fromStage: row.fromStage,
      toStage: row.toStage,
      changedBy: row.changedByUser,
      changedAt: row.changedAt.toISOString(),
      note: row.note,
    }));
  }

  async create(input: CreateCandidateInput, actor: AccessTokenPayload): Promise<CandidateDto> {
    const status = input.statusId
      ? await this.prisma.pipelineStage.findUnique({ where: { id: input.statusId } })
      : await this.prisma.pipelineStage.findFirst({ orderBy: { sortOrder: "asc" } });

    if (!status) {
      throw new BadRequestException(
        input.statusId ? "Không tìm thấy pipeline stage" : "Chưa có pipeline stage nào được seed",
      );
    }

    const created = await this.prisma.candidate.create({
      data: {
        fullName: input.fullName,
        phone: input.phone || null,
        email: input.email || null,
        dob: input.dob ? new Date(input.dob) : null,
        gender: input.gender,
        address: input.address || null,
        areaBranch: input.areaBranch || null,
        facebookLink: input.facebookLink || null,
        note: input.note || null,
        nextActionNote: input.nextActionNote || null,
        source: input.source ?? "MANUAL",
        statusId: status.id,
        recruiterId: input.recruiterId,
        tags: input.tags ?? [],
        createdBy: actor.sub,
        updatedBy: actor.sub,
      },
      include: CANDIDATE_INCLUDE,
    });

    await this.auditLogService.recordCreate(ENTITY_TABLE, created.id, actor.sub, {
      fullName: created.fullName,
      phone: created.phone,
      email: created.email,
      source: created.source,
    });

    await this.prisma.candidateStageHistory.create({
      data: {
        candidateId: created.id,
        fromStageId: null,
        toStageId: created.statusId,
        changedBy: actor.sub,
      },
    });

    await this.automationQueueService.fireRecordCreated(ENTITY_TABLE, created.id);

    const fieldDefMap = await this.loadFieldDefMap();
    const computed = await this.computeFieldsService.computeForRows(
      [created],
      Array.from(fieldDefMap.values()),
    );
    return this.toDto(created, computed.get(created.id));
  }

  async updateFields(
    actor: AccessTokenPayload,
    id: string,
    fields: Record<string, unknown>,
  ): Promise<CandidateDto> {
    const candidate = await this.getVisibleOrThrow(actor, id, { forWrite: true });
    const fieldDefMap = await this.loadFieldDefMap();

    // Dùng cú pháp relation (updater: connect) thay vì scalar updatedBy thô —
    // Prisma UpdateInput không cho trộn lẫn 2 kiểu trong cùng 1 lệnh update khi
    // có field khác cũng dùng relation connect (vd statusId -> status.connect),
    // gặp lỗi "Unknown argument updatedBy" nếu trộn.
    const data: Record<string, unknown> = { updater: { connect: { id: actor.sub } } };
    const customFields: Record<string, unknown> = {
      ...((candidate.customFields as Record<string, unknown>) ?? {}),
    };
    let touchedCustomFields = false;
    const touchedFieldDefs: { key: string; def: FieldDefinition }[] = [];

    for (const [key, value] of Object.entries(fields)) {
      const def = fieldDefMap.get(key);
      if (!def) {
        throw new BadRequestException(`Field "${key}" không tồn tại trên bảng candidates`);
      }
      touchedFieldDefs.push({ key, def });

      if (!def.isSystem) {
        customFields[key] = value;
        touchedCustomFields = true;
        continue;
      }

      if (READONLY_SYSTEM_FIELD_KEYS.has(key)) {
        throw new BadRequestException(`Field "${key}" do hệ thống tự ghi, không sửa tay được`);
      }

      this.assignSystemField(data, key, value);
    }

    if (touchedCustomFields) {
      data.customFields = customFields;
    }

    const beforeValues = new Map(
      touchedFieldDefs.map(({ key, def }) => [key, this.readFieldRawValue(candidate, def)]),
    );

    const updated = await this.prisma.candidate.update({
      where: { id },
      data,
      include: CANDIDATE_INCLUDE,
    });

    const changes: AuditChangeInput[] = [];
    for (const { key, def } of touchedFieldDefs) {
      const oldValue = beforeValues.get(key) ?? null;
      const newValue = this.readFieldRawValue(updated, def);
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({ fieldName: key, oldValue, newValue });
      }
    }
    await this.auditLogService.recordUpdate(ENTITY_TABLE, id, actor.sub, changes);

    if (candidate.statusId !== updated.statusId) {
      await this.prisma.candidateStageHistory.create({
        data: {
          candidateId: id,
          fromStageId: candidate.statusId,
          toStageId: updated.statusId,
          changedBy: actor.sub,
        },
      });
    }

    if (changes.length > 0) {
      await this.automationQueueService.fireFieldChanged(
        ENTITY_TABLE,
        id,
        changes.map((c) => c.fieldName).filter((f): f is string => !!f),
      );
    }

    const computed = await this.computeFieldsService.computeForRows(
      [updated],
      Array.from(fieldDefMap.values()),
    );
    return this.toDto(updated, computed.get(updated.id));
  }

  async softDelete(actor: AccessTokenPayload, id: string): Promise<{ success: true }> {
    await this.getVisibleOrThrow(actor, id, { forWrite: true });
    await this.prisma.candidate.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: actor.sub },
    });
    await this.auditLogService.recordDelete(ENTITY_TABLE, id, actor.sub);
    return { success: true };
  }

  /**
   * Bulk Actions chạy lại đúng logic 1-dòng (updateFields/softDelete) cho từng
   * id — giữ nguyên RBAC scoping, audit log, stage history và automation
   * trigger của từng dòng, chỉ gộp thành 1 request mạng thay vì N request từ
   * trình duyệt. Lỗi ở 1 id không chặn các id còn lại.
   */
  async bulkUpdateStatus(
    actor: AccessTokenPayload,
    ids: string[],
    statusId: string,
  ): Promise<BulkActionResult> {
    return this.runBulk(ids, (id) => this.updateFields(actor, id, { statusId }));
  }

  async bulkUpdateRecruiter(
    actor: AccessTokenPayload,
    ids: string[],
    recruiterId: string | null,
  ): Promise<BulkActionResult> {
    return this.runBulk(ids, (id) => this.updateFields(actor, id, { recruiterId }));
  }

  async bulkSoftDelete(actor: AccessTokenPayload, ids: string[]): Promise<BulkActionResult> {
    return this.runBulk(ids, (id) => this.softDelete(actor, id));
  }

  private async runBulk(
    ids: string[],
    action: (id: string) => Promise<unknown>,
  ): Promise<BulkActionResult> {
    const succeeded: string[] = [];
    const failed: { id: string; reason: string }[] = [];
    for (const id of ids) {
      try {
        await action(id);
        succeeded.push(id);
      } catch (error) {
        failed.push({ id, reason: error instanceof Error ? error.message : "Lỗi không xác định" });
      }
    }
    return { succeeded, failed };
  }

  async addRelation(
    actor: AccessTokenPayload,
    candidateId: string,
    fieldKey: string,
    toRecordId: string,
  ): Promise<{ success: true }> {
    const field = await this.getRelationFieldOrThrow(fieldKey);
    await this.getVisibleOrThrow(actor, candidateId, { forWrite: true });
    if (toRecordId === candidateId) {
      throw new BadRequestException("Không thể liên kết ứng viên với chính nó");
    }
    await this.getVisibleOrThrow(actor, toRecordId);

    const existing = await this.prisma.recordLink.findFirst({
      where: { fieldId: field.id, fromRecordId: candidateId, toRecordId },
    });
    if (existing) return { success: true };

    await this.prisma.recordLink.create({
      data: {
        fieldId: field.id,
        fromTableKey: "candidates",
        fromRecordId: candidateId,
        toTableKey: "candidates",
        toRecordId,
      },
    });
    return { success: true };
  }

  async removeRelation(
    actor: AccessTokenPayload,
    candidateId: string,
    fieldKey: string,
    toRecordId: string,
  ): Promise<{ success: true }> {
    const field = await this.getRelationFieldOrThrow(fieldKey);
    await this.getVisibleOrThrow(actor, candidateId, { forWrite: true });
    await this.prisma.recordLink.deleteMany({
      where: { fieldId: field.id, fromRecordId: candidateId, toRecordId },
    });
    return { success: true };
  }

  private async getRelationFieldOrThrow(fieldKey: string): Promise<FieldDefinition> {
    const field = await this.prisma.fieldDefinition.findUnique({
      where: { tableKey_fieldKey: { tableKey: ENTITY_TABLE, fieldKey } },
    });
    if (!field || field.fieldType !== "RELATION") {
      throw new BadRequestException(`Field "${fieldKey}" không phải field kiểu RELATION`);
    }
    const options = field.options as { toTableKey?: string } | null;
    if (options?.toTableKey !== "candidates") {
      throw new BadRequestException(
        `Field "${fieldKey}" liên kết tới bảng "${options?.toTableKey}", chưa được hỗ trợ qua endpoint này`,
      );
    }
    return field;
  }

  private readFieldRawValue(candidate: Candidate, def: FieldDefinition): unknown {
    if (!def.isSystem) {
      return (candidate.customFields as Record<string, unknown> | null)?.[def.fieldKey] ?? null;
    }
    return (candidate as unknown as Record<string, unknown>)[def.fieldKey] ?? null;
  }

  private assignSystemField(data: Record<string, unknown>, key: string, value: unknown): void {
    if (PLAIN_TEXT_FIELD_KEYS.has(key)) {
      data[key] = typeof value === "string" && value.trim() === "" ? null : value;
      return;
    }

    switch (key) {
      case "dob":
        if (value === null || value === undefined || value === "") {
          data.dob = null;
        } else if (typeof value === "string" || typeof value === "number") {
          data.dob = new Date(value);
        } else {
          throw new BadRequestException("Giá trị ngày sinh không hợp lệ");
        }
        return;
      case "gender":
        data.gender = value || null;
        return;
      case "source":
        data.source = value;
        return;
      case "tags":
        data.tags = Array.isArray(value) ? value : [];
        return;
      case "statusId":
        if (!value) throw new BadRequestException("Next Step không được để trống");
        data.status = { connect: { id: value } };
        return;
      case "recruiterId":
        data.recruiter = value ? { connect: { id: value } } : { disconnect: true };
        return;
      case "landingPageId":
        data.landingPage = value ? { connect: { id: value } } : { disconnect: true };
        return;
      default:
        throw new BadRequestException(`Field "${key}" chưa được hỗ trợ sửa qua API`);
    }
  }

  /** Dùng bởi các module khác (CV/Interview/Comment) cần kiểm tra quyền truy cập 1 candidate. */
  async assertCandidateVisible(
    viewer: AccessTokenPayload,
    id: string,
    options?: { forWrite?: boolean },
  ): Promise<{ id: string; fullName: string; recruiterId: string | null }> {
    const candidate = await this.getVisibleOrThrow(viewer, id, options);
    return { id: candidate.id, fullName: candidate.fullName, recruiterId: candidate.recruiterId };
  }

  private async getVisibleOrThrow(
    viewer: AccessTokenPayload,
    id: string,
    options?: { forWrite?: boolean },
  ): Promise<CandidateWithRelations> {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id },
      include: CANDIDATE_INCLUDE,
    });

    if (!candidate || candidate.deletedAt) {
      throw new NotFoundException("Không tìm thấy ứng viên");
    }

    const hasFullVisibility = ROLES_WITH_FULL_VISIBILITY.has(viewer.role);
    const isOwnRecruiterCandidate = candidate.recruiterId === viewer.sub;
    const isAssignedInterviewer =
      viewer.role === "INTERVIEWER" &&
      (await this.prisma.interview.findFirst({
        where: { candidateId: id, interviewerId: viewer.sub },
        select: { id: true },
      })) !== null;
    if (!hasFullVisibility && !isOwnRecruiterCandidate && !isAssignedInterviewer) {
      throw new ForbiddenException("Bạn không có quyền truy cập ứng viên này");
    }

    if (options?.forWrite && viewer.role === "VIEWER") {
      throw new ForbiddenException("Viewer chỉ có quyền xem");
    }

    return candidate;
  }

  private toDto(
    candidate: CandidateWithRelations,
    computedFields?: Record<string, unknown>,
  ): CandidateDto {
    return {
      id: candidate.id,
      fullName: candidate.fullName,
      phone: candidate.phone,
      email: candidate.email,
      dob: candidate.dob ? candidate.dob.toISOString().slice(0, 10) : null,
      gender: candidate.gender,
      address: candidate.address,
      areaBranch: candidate.areaBranch,
      facebookLink: candidate.facebookLink,
      photoUrl: candidate.photoUrl,
      source: candidate.source,
      note: candidate.note,
      nextActionNote: candidate.nextActionNote,
      tags: candidate.tags,
      status: candidate.status,
      recruiter: candidate.recruiter,
      landingPage: candidate.landingPage,
      firstUtmSource: candidate.firstUtmSource,
      firstUtmMedium: candidate.firstUtmMedium,
      firstUtmCampaign: candidate.firstUtmCampaign,
      firstUtmContent: candidate.firstUtmContent,
      firstUtmTerm: candidate.firstUtmTerm,
      firstIp: candidate.firstIp,
      firstDevice: candidate.firstDevice,
      firstOs: candidate.firstOs,
      firstBrowser: candidate.firstBrowser,
      firstReferrer: candidate.firstReferrer,
      customFields: {
        ...((candidate.customFields as Record<string, unknown>) ?? {}),
        ...(computedFields ?? {}),
      },
      lastEmailLog: candidate.emailLogs[0]
        ? {
            subject: candidate.emailLogs[0].subject,
            sentAt: candidate.emailLogs[0].sentAt?.toISOString() ?? new Date().toISOString(),
          }
        : null,
      createdAt: candidate.createdAt.toISOString(),
      updatedAt: candidate.updatedAt.toISOString(),
    };
  }
}

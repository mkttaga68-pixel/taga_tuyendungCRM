import { Injectable, Logger } from "@nestjs/common";
import { Prisma, type FormSubmission, type LandingPage } from "@prisma/client";
import type { FieldType } from "@prisma/client";
import type { FormSchemaShape, PublicSubmitPayload } from "@taga-crm/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogService } from "../audit-log/audit-log.service";
import { StorageService } from "../storage/storage.service";
import { AutomationQueueService } from "../automation/automation-queue.service";
import {
  guessCvMimeType,
  normalizeEmail,
  normalizeVnPhone,
  toStringValueOrNull,
} from "./candidate-matching.util";

const CORE_MERGE_FIELDS = [
  "email",
  "phone",
  "dob",
  "address",
  "areaBranch",
  "facebookLink",
] as const;

const FORM_FIELD_TYPE_TO_FIELD_TYPE: Record<string, FieldType> = {
  TEXT: "TEXT",
  LONG_TEXT: "LONG_TEXT",
  PHONE: "PHONE",
  EMAIL: "EMAIL",
  DATE: "DATE",
  SELECT: "SELECT",
  CHECKBOX: "CHECKBOX",
};

interface ExtractedFields {
  fullName: string | null;
  phone: string | null;
  email: string | null;
  dob: string | null;
  address: string | null;
  areaBranch: string | null;
  facebookLink: string | null;
  note: string | null;
  customFields: Record<string, unknown>;
}

@Injectable()
export class CandidateMatchingService {
  private readonly logger = new Logger(CandidateMatchingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly storageService: StorageService,
    private readonly automationQueueService: AutomationQueueService,
  ) {}

  /** Xử lý dedup/merge hoặc tạo mới candidate từ 1 FormSubmission đã lưu sẵn raw_payload. */
  async processSubmission(
    submission: FormSubmission,
    landingPage: LandingPage,
    formSchema: FormSchemaShape | null,
  ): Promise<{ status: "PROCESSED" | "DUPLICATE" | "ERROR"; candidateId: string | null }> {
    try {
      const payload = submission.rawPayload as unknown as PublicSubmitPayload;
      const extracted = await this.extractFields(payload.values ?? {}, formSchema);

      if (!extracted.fullName?.trim()) {
        return this.markError(submission.id, 'Thiếu "Họ và tên"');
      }

      const normalizedPhone = normalizeVnPhone(extracted.phone);
      const normalizedEmail = normalizeEmail(extracted.email);

      const orConditions: Prisma.CandidateWhereInput[] = [];
      if (normalizedPhone) orConditions.push({ phone: normalizedPhone });
      if (normalizedEmail) orConditions.push({ email: normalizedEmail });

      const existing =
        orConditions.length > 0
          ? await this.prisma.candidate.findFirst({
              where: { deletedAt: null, OR: orConditions },
              orderBy: { createdAt: "asc" },
            })
          : null;

      if (existing) {
        await this.mergeIntoExisting(existing.id, extracted, normalizedPhone, normalizedEmail);
        await this.prisma.formSubmission.update({
          where: { id: submission.id },
          data: { candidateId: existing.id, processingStatus: "DUPLICATE", errorMessage: null },
        });
        return { status: "DUPLICATE", candidateId: existing.id };
      }

      const candidateId = await this.createFromIngestion(
        landingPage,
        extracted,
        normalizedPhone,
        normalizedEmail,
        submission,
        payload,
      );
      await this.prisma.formSubmission.update({
        where: { id: submission.id },
        data: { candidateId, processingStatus: "PROCESSED", errorMessage: null },
      });
      return { status: "PROCESSED", candidateId };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định";
      this.logger.error(`Xử lý form_submission ${submission.id} thất bại: ${message}`);
      return this.markError(submission.id, message);
    }
  }

  private async markError(
    submissionId: string,
    message: string,
  ): Promise<{ status: "ERROR"; candidateId: null }> {
    await this.prisma.formSubmission.update({
      where: { id: submissionId },
      data: { processingStatus: "ERROR", errorMessage: message },
    });
    return { status: "ERROR", candidateId: null };
  }

  private async extractFields(
    values: Record<string, unknown>,
    formSchema: FormSchemaShape | null,
  ): Promise<ExtractedFields> {
    const mappingByKey = new Map<string, string>();
    const typeByKey = new Map<string, string>();
    if (formSchema) {
      for (const field of formSchema.fields) {
        if (field.mapsTo) mappingByKey.set(field.key, field.mapsTo);
        typeByKey.set(field.key, field.type);
      }
    } else {
      // Fallback khi chưa cấu hình Form Builder — map cả key kỹ thuật lẫn
      // label tiếng Việt (Ladipage dùng label làm name attribute).
      // fullName
      mappingByKey.set("hoTen", "fullName");
      mappingByKey.set("fullName", "fullName");
      mappingByKey.set("full_name", "fullName");
      mappingByKey.set("Họ và tên", "fullName");
      mappingByKey.set("Ho va ten", "fullName");
      mappingByKey.set("Họ tên", "fullName");
      // phone
      mappingByKey.set("soDienThoai", "phone");
      mappingByKey.set("phone", "phone");
      mappingByKey.set("Số điện thoại", "phone");
      mappingByKey.set("So dien thoai", "phone");
      mappingByKey.set("dien_thoai", "phone");
      // email
      mappingByKey.set("email", "email");
      mappingByKey.set("Email", "email");
      // dob
      mappingByKey.set("ngaySinh", "dob");
      mappingByKey.set("dob", "dob");
      mappingByKey.set("Ngày sinh", "dob");
      mappingByKey.set("Ngay sinh", "dob");
      mappingByKey.set("ngay_sinh", "dob");
      // address
      mappingByKey.set("diaChi", "address");
      mappingByKey.set("address", "address");
      mappingByKey.set("Địa chỉ", "address");
      mappingByKey.set("Dia chi", "address");
      mappingByKey.set("dia_chi", "address");
      // areaBranch
      mappingByKey.set("khuVuc", "areaBranch");
      mappingByKey.set("areaBranch", "areaBranch");
      mappingByKey.set("Khu vực", "areaBranch");
      mappingByKey.set("Địa chỉ - Quận/Huyện", "areaBranch");
      mappingByKey.set("Quận/Huyện", "areaBranch");
      mappingByKey.set("Quan/Huyen", "areaBranch");
      mappingByKey.set("quan_huyen", "areaBranch");
      mappingByKey.set("district", "areaBranch");
    }

    const result: ExtractedFields = {
      fullName: null,
      phone: null,
      email: null,
      dob: null,
      address: null,
      areaBranch: null,
      facebookLink: null,
      note: null,
      customFields: {},
    };

    for (const [key, value] of Object.entries(values)) {
      const mapsTo = mappingByKey.get(key);
      const stringValue = toStringValueOrNull(value);
      switch (mapsTo) {
        case "fullName":
          result.fullName = stringValue;
          break;
        case "phone":
          result.phone = stringValue;
          break;
        case "email":
          result.email = stringValue;
          break;
        case "dob":
          result.dob = stringValue;
          break;
        case "address":
          result.address = stringValue;
          break;
        case "areaBranch":
          result.areaBranch = stringValue;
          break;
        case "facebookLink":
          result.facebookLink = stringValue;
          break;
        case "note":
          result.note = stringValue;
          break;
        case "cv":
          break;
        default:
          result.customFields[key] = value;
          await this.ensureCustomFieldDefinition(key, typeByKey.get(key));
      }
    }

    return result;
  }

  private async ensureCustomFieldDefinition(
    key: string,
    formFieldType: string | undefined,
  ): Promise<void> {
    const existing = await this.prisma.fieldDefinition.findUnique({
      where: { tableKey_fieldKey: { tableKey: "candidates", fieldKey: key } },
    });
    if (existing) return;

    const maxSortOrder = await this.prisma.fieldDefinition.aggregate({
      where: { tableKey: "candidates" },
      _max: { sortOrder: true },
    });

    await this.prisma.fieldDefinition.create({
      data: {
        tableKey: "candidates",
        fieldKey: key,
        label: key,
        fieldType: (formFieldType && FORM_FIELD_TYPE_TO_FIELD_TYPE[formFieldType]) || "TEXT",
        sortOrder: (maxSortOrder._max.sortOrder ?? 0) + 1,
        isHidden: true,
        isSystem: false,
      },
    });
  }

  private async mergeIntoExisting(
    candidateId: string,
    extracted: ExtractedFields,
    normalizedPhone: string | null,
    normalizedEmail: string | null,
  ): Promise<void> {
    const existing = await this.prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!existing) return;

    const candidateValueByField: Record<(typeof CORE_MERGE_FIELDS)[number], string | null> = {
      email: normalizedEmail,
      phone: normalizedPhone,
      dob: extracted.dob,
      address: extracted.address,
      areaBranch: extracted.areaBranch,
      facebookLink: extracted.facebookLink,
    };

    const data: Record<string, unknown> = {};
    const auditChanges: { fieldName: string; oldValue: unknown; newValue: unknown }[] = [];

    for (const field of CORE_MERGE_FIELDS) {
      const newValue = candidateValueByField[field];
      const currentValue = (existing as unknown as Record<string, unknown>)[field];
      const isCurrentEmpty =
        currentValue === null || currentValue === undefined || currentValue === "";
      if (isCurrentEmpty && newValue) {
        if (field === "dob") {
          data.dob = new Date(newValue);
        } else {
          data[field] = newValue;
        }
        auditChanges.push({ fieldName: field, oldValue: currentValue ?? null, newValue });
      }
    }

    if (Object.keys(data).length === 0) return;

    await this.prisma.candidate.update({ where: { id: candidateId }, data });
    await this.auditLogService.recordUpdate("candidates", candidateId, null, auditChanges);
  }

  private async createFromIngestion(
    landingPage: LandingPage,
    extracted: ExtractedFields,
    normalizedPhone: string | null,
    normalizedEmail: string | null,
    submission: FormSubmission,
    payload: PublicSubmitPayload,
  ): Promise<string> {
    const firstStage = await this.prisma.pipelineStage.findFirst({ orderBy: { sortOrder: "asc" } });
    if (!firstStage) {
      throw new Error("Chưa có pipeline stage nào được seed");
    }

    const created = await this.prisma.candidate.create({
      data: {
        fullName: extracted.fullName!.trim(),
        phone: normalizedPhone,
        email: normalizedEmail,
        dob: extracted.dob ? new Date(extracted.dob) : null,
        address: extracted.address,
        areaBranch: extracted.areaBranch,
        facebookLink: extracted.facebookLink,
        note: extracted.note,
        source: "LANDING_PAGE",
        landingPageId: landingPage.id,
        statusId: firstStage.id,
        customFields: extracted.customFields as Prisma.InputJsonValue,
        firstUtmSource: submission.utmSource,
        firstUtmMedium: submission.utmMedium,
        firstUtmCampaign: submission.utmCampaign,
        firstUtmContent: submission.utmContent,
        firstUtmTerm: submission.utmTerm,
        firstIp: submission.ip,
        firstDevice: submission.device,
        firstOs: submission.os,
        firstBrowser: submission.browser,
        firstReferrer: submission.referrer,
      },
    });

    if (payload.cvBase64 && payload.cvFileName) {
      try {
        const buffer = Buffer.from(payload.cvBase64, "base64");
        const saved = await this.storageService.saveBuffer(buffer, payload.cvFileName);
        await this.prisma.cvAttachment.create({
          data: {
            candidateId: created.id,
            fileName: payload.cvFileName,
            fileUrl: `/files/${saved.key}`,
            mimeType: guessCvMimeType(payload.cvFileName),
            sizeBytes: saved.sizeBytes,
            version: 1,
            isCurrent: true,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Lỗi không xác định";
        this.logger.error(`Lưu CV cho candidate ${created.id} thất bại: ${message}`);
      }
    }

    await this.auditLogService.recordCreate("candidates", created.id, null, {
      fullName: created.fullName,
      phone: created.phone,
      email: created.email,
      source: created.source,
      landingPageId: created.landingPageId,
    });

    await this.prisma.candidateStageHistory.create({
      data: {
        candidateId: created.id,
        fromStageId: null,
        toStageId: created.statusId,
        changedBy: null,
      },
    });

    await this.automationQueueService.fireRecordCreated("candidates", created.id);

    return created.id;
  }
}

import { BadRequestException, Injectable } from "@nestjs/common";
import type { AccessTokenPayload, CvAttachmentDto } from "@taga-crm/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { CandidatesService } from "../candidates/candidates.service";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

@Injectable()
export class CvAttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly candidatesService: CandidatesService,
  ) {}

  async list(viewer: AccessTokenPayload, candidateId: string): Promise<CvAttachmentDto[]> {
    await this.candidatesService.assertCandidateVisible(viewer, candidateId);
    const rows = await this.prisma.cvAttachment.findMany({
      where: { candidateId },
      include: { uploader: { select: { id: true, fullName: true } } },
      orderBy: { version: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      candidateId: row.candidateId,
      fileName: row.fileName,
      fileUrl: row.fileUrl,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      version: row.version,
      uploadedBy: row.uploader,
      uploadedAt: row.uploadedAt.toISOString(),
      isCurrent: row.isCurrent,
    }));
  }

  async upload(
    viewer: AccessTokenPayload,
    candidateId: string,
    file: Express.Multer.File,
  ): Promise<CvAttachmentDto> {
    await this.candidatesService.assertCandidateVisible(viewer, candidateId, { forWrite: true });

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException("Chỉ nhận file PDF/DOC/DOCX");
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException("File CV không được vượt quá 10MB");
    }

    const saved = await this.storageService.saveBuffer(file.buffer, file.originalname);
    const latest = await this.prisma.cvAttachment.findFirst({
      where: { candidateId },
      orderBy: { version: "desc" },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.cvAttachment.updateMany({
        where: { candidateId, isCurrent: true },
        data: { isCurrent: false },
      });
      return tx.cvAttachment.create({
        data: {
          candidateId,
          fileName: file.originalname,
          fileUrl: `/files/${saved.key}`,
          mimeType: file.mimetype,
          sizeBytes: saved.sizeBytes,
          version: nextVersion,
          uploadedBy: viewer.sub,
          isCurrent: true,
        },
        include: { uploader: { select: { id: true, fullName: true } } },
      });
    });

    return {
      id: created.id,
      candidateId: created.candidateId,
      fileName: created.fileName,
      fileUrl: created.fileUrl,
      mimeType: created.mimeType,
      sizeBytes: created.sizeBytes,
      version: created.version,
      uploadedBy: created.uploader,
      uploadedAt: created.uploadedAt.toISOString(),
      isCurrent: created.isCurrent,
    };
  }
}

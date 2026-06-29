export interface CvAttachmentDto {
  id: string;
  candidateId: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  version: number;
  uploadedBy: { id: string; fullName: string } | null;
  uploadedAt: string;
  isCurrent: boolean;
}

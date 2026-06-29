import { useAuthStore } from "@/stores/auth-store";
import { apiRequest } from "./api-client";
import type { CvAttachmentDto } from "@taga-crm/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function listCvAttachments(candidateId: string) {
  return apiRequest<CvAttachmentDto[]>(`/candidates/${candidateId}/cv-attachments`);
}

export function uploadCvAttachment(candidateId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<CvAttachmentDto>(`/candidates/${candidateId}/cv-attachments`, {
    method: "POST",
    body: formData,
  });
}

/**
 * Endpoint /files/:key yêu cầu Bearer token (đang giữ trong memory, không
 * phải cookie) — không thể dùng trực tiếp làm href/iframe src. Tải về dạng
 * blob bằng fetch có header Authorization, rồi tạo Object URL tạm cho
 * preview/download. Gọi URL.revokeObjectURL khi component unmount.
 */
export async function fetchCvObjectUrl(attachment: CvAttachmentDto): Promise<string> {
  const token = useAuthStore.getState().accessToken;
  const params = new URLSearchParams({ filename: attachment.fileName, mimeType: attachment.mimeType });
  const res = await fetch(`${API_URL}${attachment.fileUrl}?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: "include",
  });
  if (!res.ok) throw new Error("Không tải được file CV");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function downloadCvAttachment(attachment: CvAttachmentDto): Promise<void> {
  const url = await fetchCvObjectUrl(attachment);
  const link = document.createElement("a");
  link.href = url;
  link.download = attachment.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

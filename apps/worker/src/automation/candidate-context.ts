import type { PrismaClient } from "@prisma/client";

/**
 * Đọc lại candidate MỚI NHẤT từ DB (không dùng snapshot cũ) — đúng ngữ nghĩa
 * khi automation có DELAY/WAIT: node chạy sau delay phải thấy dữ liệu hiện tại,
 * không phải dữ liệu lúc trigger.
 */
export async function fetchCandidateContext(
  prisma: PrismaClient,
  candidateId: string | null,
): Promise<Record<string, unknown> | null> {
  if (!candidateId) return null;
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { status: true, recruiter: true, landingPage: true },
  });
  if (!candidate) return null;

  return {
    ...candidate,
    customFields: (candidate.customFields as Record<string, unknown>) ?? {},
    statusLabel: candidate.status.label,
    recruiterName: candidate.recruiter?.fullName ?? null,
    landingPageName: candidate.landingPage?.name ?? null,
  };
}

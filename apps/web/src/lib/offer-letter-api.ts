import { useAuthStore } from "@/stores/auth-store";
import type { CreateOfferLetterInput } from "@taga-crm/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Response là PDF binary, không phải JSON — gọi fetch trực tiếp như export Excel/CSV. */
export async function downloadOfferLetter(
  candidateId: string,
  input: CreateOfferLetterInput,
): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(`${API_URL}/candidates/${candidateId}/offer-letter`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: "Không tạo được Offer Letter" }));
    throw new Error(body.message ?? "Không tạo được Offer Letter");
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "offer-letter.pdf";

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

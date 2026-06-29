import { createHash, randomBytes } from "crypto";

/** Sinh refresh token thô (opaque, không phải JWT) để gửi cho client qua httpOnly cookie. */
export function generateOpaqueToken(): string {
  return randomBytes(64).toString("hex");
}

/** Hash refresh token trước khi lưu DB — không bao giờ lưu token thô trong database. */
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

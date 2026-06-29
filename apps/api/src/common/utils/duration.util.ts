const UNIT_TO_MS = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
} as const;

/**
 * Parse chuỗi dạng "15m" / "30d" / "12h" (theo định dạng JWT_*_EXPIRES_IN trong .env)
 * thành milliseconds. Chỉ hỗ trợ đúng các đơn vị s/m/h/d vì đây là giá trị do ta
 * tự cấu hình trong .env, không phải input từ người dùng.
 */
export function parseDurationToMs(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value.trim());
  if (!match) {
    throw new Error(`Không parse được duration "${value}" — định dạng hợp lệ: 15m, 12h, 30d`);
  }
  const [, amount, unit] = match as unknown as [string, string, keyof typeof UNIT_TO_MS];
  return Number(amount) * UNIT_TO_MS[unit];
}

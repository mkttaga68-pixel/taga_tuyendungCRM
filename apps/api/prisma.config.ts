import { defineConfig } from "prisma/config";

// Từ khi có prisma.config.ts, Prisma CLI không tự load .env nữa — phải nạp thủ công.
try {
  process.loadEnvFile(".env");
} catch {
  // .env chưa tồn tại (vd: trước khi setup lần đầu, hoặc env đã được inject bởi CI/container).
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "ts-node prisma/seed.ts",
  },
});

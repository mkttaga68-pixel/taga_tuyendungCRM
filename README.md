# Taga Tuyển Dụng CRM

CRM tuyển dụng nội bộ (Spreadsheet-first, kiểu Airtable/Baserow) thay thế luồng
Landing Page → Google Apps Script → Google Sheet hiện tại. Kiến trúc đầy đủ xem
tại plan đã duyệt: `C:\Users\Admin\.claude\plans\cosmic-shimmying-pixel.md`.

## Cấu trúc monorepo

```
apps/
  api/     NestJS — REST API, Prisma/PostgreSQL, Auth (JWT+Refresh+RBAC)
  web/     Next.js (App Router) — giao diện Spreadsheet/Grid, Dashboard...
  worker/  BullMQ worker (queue Redis) — Automation Engine từ Sprint 5
packages/
  shared/  Zod schema + enum dùng chung giữa web/api (1 nguồn sự thật)
```

## Yêu cầu môi trường

- Node.js >= 20
- pnpm (máy chưa cài Docker/WSL2 → dev DB dùng cloud free-tier, xem dưới)

Cài pnpm (nếu `corepack enable` bị lỗi quyền admin trên Windows, dùng `npx pnpm <câu lệnh>` thay thế):

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## Thiết lập lần đầu

### 1. Tạo Database (Postgres) — Neon free tier

1. Vào https://neon.tech → tạo project mới (chọn region gần VN, ví dụ Singapore).
2. Copy connection string (dạng `postgresql://...sslmode=require`).

### 2. Tạo Redis — Upstash free tier

1. Vào https://upstash.com → tạo Redis database mới.
2. Copy connection string dạng `rediss://default:...@....upstash.io:6379`.

### 3. Khai báo biến môi trường

Copy `.env.example` → `.env` ở **từng app** (api/web/worker), điền `DATABASE_URL`/`REDIS_URL` vừa lấy ở trên, và tự sinh 2 secret JWT (tối thiểu 32 ký tự, ví dụ `openssl rand -hex 32`):

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/worker/.env.example apps/worker/.env
```

### 4. Cài dependency & migrate database

```bash
pnpm install
pnpm build               # build packages/shared trước (turbo lo phần dependsOn)
pnpm db:migrate          # tạo toàn bộ bảng theo prisma/schema.prisma
pnpm db:seed             # seed Next Step (pipeline_stages) + tài khoản Admin đầu tiên
```

Tài khoản Admin đầu tiên: `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` trong `apps/api/.env`
(mặc định `admin@taga.local` / xem giá trị trong `.env.example` — **đổi mật khẩu ngay**
sau lần đăng nhập đầu).

### 5. Chạy dev

```bash
pnpm dev
```

- API: http://localhost:4000 (health check: `GET /health`)
- Web: http://localhost:3000

## Ghi chú vận hành quan trọng

- **GIN trigram index cho search mờ** (`pg_trgm` trên `candidates.full_name/phone/email`)
  chưa nằm trong `prisma migrate dev` đầu tiên — chạy thêm SQL sau khi có DB:
  ```sql
  CREATE INDEX IF NOT EXISTS candidates_full_name_trgm_idx ON candidates USING GIN (full_name gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS candidates_phone_trgm_idx ON candidates USING GIN (phone gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS candidates_email_trgm_idx ON candidates USING GIN (email gin_trgm_ops);
  ```
- **Storage CV/Attachment** (`STORAGE_DRIVER=local`): file dev lưu tạm tại
  `apps/api/storage/uploads` — module này triển khai từ Sprint 4, chưa có ở Sprint 0.
  Khi lên production đổi `STORAGE_DRIVER=s3` + điền `S3_*`.
- **Docker Compose** (`docker-compose.yml` ở root): dự phòng cho self-host
  Postgres/Redis/MinIO sau này — chưa cần dùng vì đang chạy Neon/Upstash.
- Không commit `.env` thật (đã chặn trong `.gitignore`) — chỉ commit `.env.example`.

## Sprint hiện tại

Sprint 0 (scaffold + Auth/RBAC skeleton + Next.js shell). Roadmap đầy đủ ở plan
đã duyệt (mục "BƯỚC 5 — Roadmap theo Sprint").

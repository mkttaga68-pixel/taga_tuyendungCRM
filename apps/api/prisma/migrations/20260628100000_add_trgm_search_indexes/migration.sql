-- Search mờ (ILIKE '%...%') trên fullName/phone/email/note dùng GIN trigram
-- index để không full-scan khi bảng candidates lớn lên (yêu cầu chịu tải
-- triệu bản ghi). pg_trgm extension đã khai báo ở datasource block schema.prisma
-- nhưng vẫn CREATE EXTENSION IF NOT EXISTS để chắc chắn idempotent.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "candidates_full_name_trgm_idx" ON "candidates" USING gin ("full_name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "candidates_phone_trgm_idx" ON "candidates" USING gin ("phone" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "candidates_email_trgm_idx" ON "candidates" USING gin ("email" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "candidates_note_trgm_idx" ON "candidates" USING gin ("note" gin_trgm_ops);

-- AlterTable
ALTER TABLE "email_logs" ADD COLUMN     "is_read" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "email_logs_is_read_idx" ON "email_logs"("is_read");

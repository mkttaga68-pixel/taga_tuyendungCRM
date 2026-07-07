-- CreateEnum
CREATE TYPE "EmailDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- AlterTable
ALTER TABLE "email_logs" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "direction" "EmailDirection" NOT NULL DEFAULT 'OUTBOUND',
ADD COLUMN     "from_email" TEXT,
ADD COLUMN     "sent_by" UUID;

-- CreateIndex
CREATE INDEX "email_logs_direction_idx" ON "email_logs"("direction");

-- CreateIndex
CREATE INDEX "email_logs_created_at_idx" ON "email_logs"("created_at");

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

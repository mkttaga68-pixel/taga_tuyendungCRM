-- DropIndex
DROP INDEX "candidates_email_trgm_idx";

-- DropIndex
DROP INDEX "candidates_full_name_trgm_idx";

-- DropIndex
DROP INDEX "candidates_note_trgm_idx";

-- DropIndex
DROP INDEX "candidates_phone_trgm_idx";

-- AlterTable
ALTER TABLE "automation_nodes" ADD COLUMN     "is_entry" BOOLEAN NOT NULL DEFAULT false;

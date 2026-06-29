-- AlterTable
ALTER TABLE "landing_pages" ADD COLUMN     "tracking_config" JSONB NOT NULL DEFAULT '{}';

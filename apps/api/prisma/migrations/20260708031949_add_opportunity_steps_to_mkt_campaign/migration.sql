-- AlterTable
ALTER TABLE "mkt_campaigns" ADD COLUMN     "opportunity_steps" JSONB NOT NULL DEFAULT '[]';

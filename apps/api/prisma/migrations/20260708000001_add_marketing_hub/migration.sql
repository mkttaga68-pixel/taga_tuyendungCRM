-- CreateEnum
CREATE TYPE "MktCampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MktDelayUnit" AS ENUM ('MINUTES', 'HOURS', 'DAYS', 'WEEKS');

-- CreateEnum
CREATE TYPE "MktEnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'UNSUBSCRIBED', 'FAILED');

-- CreateEnum
CREATE TYPE "MktEmailSendStatus" AS ENUM ('SCHEDULED', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "MktEmailEventType" AS ENUM ('OPEN', 'CLICK', 'BOUNCE', 'SPAM', 'UNSUBSCRIBE');

-- CreateTable
CREATE TABLE "mkt_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "source" TEXT,
    "notes" TEXT,
    "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
    "candidate_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "mkt_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mkt_contact_lists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "mkt_contact_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mkt_contact_list_members" (
    "contact_id" UUID NOT NULL,
    "list_id" UUID NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mkt_contact_list_members_pkey" PRIMARY KEY ("contact_id","list_id")
);

-- CreateTable
CREATE TABLE "mkt_tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#8b5cf6',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mkt_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mkt_contact_tags" (
    "contact_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "mkt_contact_tags_pkey" PRIMARY KEY ("contact_id","tag_id")
);

-- CreateTable
CREATE TABLE "mkt_landing_page_configs" (
    "landing_page_id" UUID NOT NULL,
    "default_list_id" UUID,
    "default_campaign_id" UUID,
    "default_tag_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "source_label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mkt_landing_page_configs_pkey" PRIMARY KEY ("landing_page_id")
);

-- CreateTable
CREATE TABLE "mkt_campaigns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "MktCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "from_name" TEXT NOT NULL,
    "from_email" TEXT NOT NULL,
    "reply_to" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "mkt_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mkt_campaign_emails" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaign_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "template_id" UUID,
    "delay_value" INTEGER NOT NULL DEFAULT 0,
    "delay_unit" "MktDelayUnit" NOT NULL DEFAULT 'DAYS',
    "send_window" JSONB NOT NULL DEFAULT '{"from":"08:00","to":"20:00","days":[1,2,3,4,5],"tz":"Asia/Ho_Chi_Minh"}',
    "condition" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mkt_campaign_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mkt_campaign_enrollments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contact_id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "status" "MktEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "mkt_campaign_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mkt_email_sends" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enrollment_id" UUID NOT NULL,
    "campaign_email_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "status" "MktEmailSendStatus" NOT NULL DEFAULT 'SCHEDULED',
    "provider_message_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mkt_email_sends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mkt_email_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "send_id" UUID NOT NULL,
    "event_type" "MktEmailEventType" NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "link_url" TEXT,
    "link_hash" TEXT,

    CONSTRAINT "mkt_email_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mkt_contact_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contact_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mkt_contact_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mkt_contacts_email_key" ON "mkt_contacts"("email");

-- CreateIndex
CREATE INDEX "mkt_contacts_email_idx" ON "mkt_contacts"("email");

-- CreateIndex
CREATE INDEX "mkt_contacts_candidate_id_idx" ON "mkt_contacts"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "mkt_tags_name_key" ON "mkt_tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "mkt_tags_slug_key" ON "mkt_tags"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "mkt_campaign_emails_campaign_id_position_key" ON "mkt_campaign_emails"("campaign_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "mkt_campaign_enrollments_contact_id_campaign_id_key" ON "mkt_campaign_enrollments"("contact_id", "campaign_id");

-- CreateIndex
CREATE INDEX "mkt_campaign_enrollments_campaign_id_status_idx" ON "mkt_campaign_enrollments"("campaign_id", "status");

-- CreateIndex
CREATE INDEX "mkt_email_sends_enrollment_id_idx" ON "mkt_email_sends"("enrollment_id");

-- CreateIndex
CREATE INDEX "mkt_email_sends_scheduled_at_status_idx" ON "mkt_email_sends"("scheduled_at", "status");

-- CreateIndex
CREATE INDEX "mkt_email_events_send_id_event_type_idx" ON "mkt_email_events"("send_id", "event_type");

-- CreateIndex
CREATE INDEX "mkt_contact_events_contact_id_occurred_at_idx" ON "mkt_contact_events"("contact_id", "occurred_at");

-- CreateIndex
CREATE INDEX "mkt_campaigns_status_idx" ON "mkt_campaigns"("status");

-- AddForeignKey
ALTER TABLE "mkt_contacts" ADD CONSTRAINT "mkt_contacts_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_contact_lists" ADD CONSTRAINT "mkt_contact_lists_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_contact_list_members" ADD CONSTRAINT "mkt_contact_list_members_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "mkt_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_contact_list_members" ADD CONSTRAINT "mkt_contact_list_members_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "mkt_contact_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_contact_tags" ADD CONSTRAINT "mkt_contact_tags_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "mkt_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_contact_tags" ADD CONSTRAINT "mkt_contact_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "mkt_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_landing_page_configs" ADD CONSTRAINT "mkt_landing_page_configs_landing_page_id_fkey" FOREIGN KEY ("landing_page_id") REFERENCES "landing_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_landing_page_configs" ADD CONSTRAINT "mkt_landing_page_configs_default_list_id_fkey" FOREIGN KEY ("default_list_id") REFERENCES "mkt_contact_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_landing_page_configs" ADD CONSTRAINT "mkt_landing_page_configs_default_campaign_id_fkey" FOREIGN KEY ("default_campaign_id") REFERENCES "mkt_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_campaigns" ADD CONSTRAINT "mkt_campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_campaign_emails" ADD CONSTRAINT "mkt_campaign_emails_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "mkt_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_campaign_emails" ADD CONSTRAINT "mkt_campaign_emails_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_campaign_enrollments" ADD CONSTRAINT "mkt_campaign_enrollments_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "mkt_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_campaign_enrollments" ADD CONSTRAINT "mkt_campaign_enrollments_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "mkt_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_email_sends" ADD CONSTRAINT "mkt_email_sends_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "mkt_campaign_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_email_sends" ADD CONSTRAINT "mkt_email_sends_campaign_email_id_fkey" FOREIGN KEY ("campaign_email_id") REFERENCES "mkt_campaign_emails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_email_sends" ADD CONSTRAINT "mkt_email_sends_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "mkt_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_email_events" ADD CONSTRAINT "mkt_email_events_send_id_fkey" FOREIGN KEY ("send_id") REFERENCES "mkt_email_sends"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mkt_contact_events" ADD CONSTRAINT "mkt_contact_events_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "mkt_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'HR_MANAGER', 'RECRUITER', 'INTERVIEWER', 'VIEWER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "CandidateSource" AS ENUM ('LANDING_PAGE', 'REFERRAL', 'HEADHUNTER', 'MANUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "LandingPageStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SubmissionProcessingStatus" AS ENUM ('PENDING', 'PROCESSED', 'DUPLICATE', 'ERROR');

-- CreateEnum
CREATE TYPE "InterviewResult" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'RESCHEDULED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'LONG_TEXT', 'NUMBER', 'PHONE', 'EMAIL', 'DATE', 'DATETIME', 'CHECKBOX', 'SELECT', 'MULTI_SELECT', 'IMAGE', 'ATTACHMENT', 'LINK', 'FORMULA', 'LOOKUP', 'RELATION', 'ROLLUP', 'RATING', 'CURRENCY', 'PERCENT', 'CREATED_TIME', 'UPDATED_TIME', 'AUTO_NUMBER', 'USER');

-- CreateEnum
CREATE TYPE "ViewType" AS ENUM ('GRID', 'KANBAN', 'CALENDAR');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "AutomationTriggerType" AS ENUM ('RECORD_CREATED', 'FIELD_CHANGED', 'SCHEDULED', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "AutomationNodeType" AS ENUM ('IF', 'ELSE', 'SWITCH', 'DELAY', 'WAIT', 'WEBHOOK', 'EMAIL', 'SMS', 'TELEGRAM', 'SLACK', 'NOTIFICATION', 'GOOGLE_CALENDAR', 'GOOGLE_MEET', 'UPDATE_RECORD', 'CREATE_RECORD', 'DELETE_RECORD', 'CONDITION', 'LOOP', 'FUNCTION');

-- CreateEnum
CREATE TYPE "AutomationRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "AdSpendChannel" AS ENUM ('META', 'TIKTOK', 'GOOGLE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "role" "Role" NOT NULL,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "user_agent" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_pages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "domain" TEXT,
    "status" "LandingPageStatus" NOT NULL DEFAULT 'DRAFT',
    "api_key_hash" TEXT NOT NULL,
    "description" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "landing_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_page_forms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landing_page_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "schema" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "landing_page_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landing_page_id" UUID NOT NULL,
    "form_id" UUID,
    "raw_payload" JSONB NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "device" TEXT,
    "os" TEXT,
    "browser" TEXT,
    "referrer" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_content" TEXT,
    "utm_term" TEXT,
    "fbc" TEXT,
    "fbp" TEXT,
    "ttclid" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "candidate_id" UUID,
    "processing_status" "SubmissionProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "dob" DATE,
    "gender" "Gender",
    "address" TEXT,
    "area_branch" TEXT,
    "facebook_link" TEXT,
    "photo_url" TEXT,
    "source" "CandidateSource" NOT NULL DEFAULT 'LANDING_PAGE',
    "landing_page_id" UUID,
    "recruiter_id" UUID,
    "status_id" UUID NOT NULL,
    "next_action_note" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "first_utm_source" TEXT,
    "first_utm_medium" TEXT,
    "first_utm_campaign" TEXT,
    "first_utm_content" TEXT,
    "first_utm_term" TEXT,
    "first_ip" TEXT,
    "first_device" TEXT,
    "first_os" TEXT,
    "first_browser" TEXT,
    "first_referrer" TEXT,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_stages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_terminal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_stage_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "from_stage_id" UUID,
    "to_stage_id" UUID NOT NULL,
    "changed_by" UUID,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "candidate_stage_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cv_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "uploaded_by" UUID,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_current" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cv_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "round" INTEGER NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "scheduled_time" TEXT NOT NULL,
    "interviewer_id" UUID,
    "location" TEXT,
    "google_meet_link" TEXT,
    "google_calendar_event_id" TEXT,
    "note" TEXT,
    "result" "InterviewResult" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_table" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "body_text" TEXT NOT NULL,
    "mentions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_table" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "field_name" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "changed_by" UUID,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_definitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "table_key" TEXT NOT NULL,
    "field_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "field_type" "FieldType" NOT NULL,
    "options" JSONB DEFAULT '{}',
    "sort_order" INTEGER NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 160,
    "is_frozen" BOOLEAN NOT NULL DEFAULT false,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "field_id" UUID NOT NULL,
    "from_table_key" TEXT NOT NULL,
    "from_record_id" UUID NOT NULL,
    "to_table_key" TEXT NOT NULL,
    "to_record_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "views" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "table_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ViewType" NOT NULL DEFAULT 'GRID',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "owner_id" UUID,
    "filters" JSONB NOT NULL DEFAULT '[]',
    "sorts" JSONB NOT NULL DEFAULT '[]',
    "group_by" JSONB,
    "hidden_fields" JSONB NOT NULL DEFAULT '[]',
    "frozen_field_count" INTEGER NOT NULL DEFAULT 1,
    "row_height" TEXT NOT NULL DEFAULT 'SHORT',
    "color_rules" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "blocks" JSONB NOT NULL,
    "thumbnail_url" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID,
    "to_email" TEXT NOT NULL,
    "candidate_id" UUID,
    "subject" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "provider_message_id" TEXT,
    "sent_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_workflows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "trigger_type" "AutomationTriggerType" NOT NULL,
    "trigger_config" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_nodes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflow_id" UUID NOT NULL,
    "node_key" TEXT NOT NULL,
    "type" "AutomationNodeType" NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "position_x" DOUBLE PRECISION NOT NULL,
    "position_y" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "automation_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_edges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflow_id" UUID NOT NULL,
    "from_node_key" TEXT NOT NULL,
    "to_node_key" TEXT NOT NULL,
    "condition_label" TEXT,

    CONSTRAINT "automation_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflow_id" UUID NOT NULL,
    "trigger_record_table" TEXT,
    "trigger_record_id" UUID,
    "status" "AutomationRunStatus" NOT NULL DEFAULT 'RUNNING',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "automation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_run_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "run_id" UUID NOT NULL,
    "node_key" TEXT NOT NULL,
    "status" "AutomationRunStatus" NOT NULL DEFAULT 'RUNNING',
    "input" JSONB,
    "output" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "automation_run_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_spend" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landing_page_id" UUID,
    "channel" "AdSpendChannel" NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_spend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_page_metrics_daily" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landing_page_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "page_views" INTEGER NOT NULL DEFAULT 0,
    "form_views" INTEGER NOT NULL DEFAULT 0,
    "form_submits" INTEGER NOT NULL DEFAULT 0,
    "conversion_rate" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "bounce_rate" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "avg_time_seconds" INTEGER NOT NULL DEFAULT 0,
    "cost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cost_per_form" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cost_per_hire" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'GA4',

    CONSTRAINT "landing_page_metrics_daily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "landing_pages_slug_key" ON "landing_pages"("slug");

-- CreateIndex
CREATE INDEX "landing_pages_status_idx" ON "landing_pages"("status");

-- CreateIndex
CREATE UNIQUE INDEX "landing_page_forms_landing_page_id_version_key" ON "landing_page_forms"("landing_page_id", "version");

-- CreateIndex
CREATE INDEX "form_submissions_landing_page_id_submitted_at_idx" ON "form_submissions"("landing_page_id", "submitted_at");

-- CreateIndex
CREATE INDEX "form_submissions_processing_status_idx" ON "form_submissions"("processing_status");

-- CreateIndex
CREATE INDEX "candidates_phone_idx" ON "candidates"("phone");

-- CreateIndex
CREATE INDEX "candidates_email_idx" ON "candidates"("email");

-- CreateIndex
CREATE INDEX "candidates_recruiter_id_status_id_idx" ON "candidates"("recruiter_id", "status_id");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_stages_key_key" ON "pipeline_stages"("key");

-- CreateIndex
CREATE INDEX "candidate_stage_history_candidate_id_idx" ON "candidate_stage_history"("candidate_id");

-- CreateIndex
CREATE INDEX "cv_attachments_candidate_id_idx" ON "cv_attachments"("candidate_id");

-- CreateIndex
CREATE INDEX "interviews_candidate_id_idx" ON "interviews"("candidate_id");

-- CreateIndex
CREATE INDEX "interviews_interviewer_id_scheduled_date_idx" ON "interviews"("interviewer_id", "scheduled_date");

-- CreateIndex
CREATE INDEX "comments_entity_table_entity_id_idx" ON "comments"("entity_table", "entity_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "audit_logs_entity_table_entity_id_idx" ON "audit_logs"("entity_table", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_changed_by_idx" ON "audit_logs"("changed_by");

-- CreateIndex
CREATE INDEX "field_definitions_table_key_idx" ON "field_definitions"("table_key");

-- CreateIndex
CREATE UNIQUE INDEX "field_definitions_table_key_field_key_key" ON "field_definitions"("table_key", "field_key");

-- CreateIndex
CREATE INDEX "record_links_from_table_key_from_record_id_idx" ON "record_links"("from_table_key", "from_record_id");

-- CreateIndex
CREATE INDEX "record_links_to_table_key_to_record_id_idx" ON "record_links"("to_table_key", "to_record_id");

-- CreateIndex
CREATE INDEX "views_table_key_idx" ON "views"("table_key");

-- CreateIndex
CREATE INDEX "email_logs_candidate_id_idx" ON "email_logs"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "automation_nodes_workflow_id_node_key_key" ON "automation_nodes"("workflow_id", "node_key");

-- CreateIndex
CREATE INDEX "automation_edges_workflow_id_idx" ON "automation_edges"("workflow_id");

-- CreateIndex
CREATE INDEX "automation_runs_workflow_id_status_idx" ON "automation_runs"("workflow_id", "status");

-- CreateIndex
CREATE INDEX "automation_run_logs_run_id_idx" ON "automation_run_logs"("run_id");

-- CreateIndex
CREATE INDEX "ad_spend_landing_page_id_date_idx" ON "ad_spend"("landing_page_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "landing_page_metrics_daily_landing_page_id_date_key" ON "landing_page_metrics_daily"("landing_page_id", "date");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_page_forms" ADD CONSTRAINT "landing_page_forms_landing_page_id_fkey" FOREIGN KEY ("landing_page_id") REFERENCES "landing_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_landing_page_id_fkey" FOREIGN KEY ("landing_page_id") REFERENCES "landing_pages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "landing_page_forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_landing_page_id_fkey" FOREIGN KEY ("landing_page_id") REFERENCES "landing_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "pipeline_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_stage_history" ADD CONSTRAINT "candidate_stage_history_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_stage_history" ADD CONSTRAINT "candidate_stage_history_from_stage_id_fkey" FOREIGN KEY ("from_stage_id") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_stage_history" ADD CONSTRAINT "candidate_stage_history_to_stage_id_fkey" FOREIGN KEY ("to_stage_id") REFERENCES "pipeline_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_stage_history" ADD CONSTRAINT "candidate_stage_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv_attachments" ADD CONSTRAINT "cv_attachments_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv_attachments" ADD CONSTRAINT "cv_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_definitions" ADD CONSTRAINT "field_definitions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_links" ADD CONSTRAINT "record_links_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "views" ADD CONSTRAINT "views_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_workflows" ADD CONSTRAINT "automation_workflows_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_nodes" ADD CONSTRAINT "automation_nodes_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "automation_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_edges" ADD CONSTRAINT "automation_edges_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "automation_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "automation_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_run_logs" ADD CONSTRAINT "automation_run_logs_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "automation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_spend" ADD CONSTRAINT "ad_spend_landing_page_id_fkey" FOREIGN KEY ("landing_page_id") REFERENCES "landing_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_spend" ADD CONSTRAINT "ad_spend_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_page_metrics_daily" ADD CONSTRAINT "landing_page_metrics_daily_landing_page_id_fkey" FOREIGN KEY ("landing_page_id") REFERENCES "landing_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

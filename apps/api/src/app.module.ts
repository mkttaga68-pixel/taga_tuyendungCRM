import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { validateEnv } from "./config/env.validation";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { HealthModule } from "./health/health.module";
import { FieldDefinitionsModule } from "./field-definitions/field-definitions.module";
import { CandidatesModule } from "./candidates/candidates.module";
import { PipelineStagesModule } from "./pipeline-stages/pipeline-stages.module";
import { ViewsModule } from "./views/views.module";
import { AuditLogModule } from "./audit-log/audit-log.module";
import { StorageModule } from "./storage/storage.module";
import { LandingPagesModule } from "./landing-pages/landing-pages.module";
import { IngestionModule } from "./ingestion/ingestion.module";
import { CvAttachmentsModule } from "./cv-attachments/cv-attachments.module";
import { InterviewsModule } from "./interviews/interviews.module";
import { CommentsModule } from "./comments/comments.module";
import { AutomationModule } from "./automation/automation.module";
import { OfferLetterModule } from "./offer-letters/offer-letter.module";
import { GoogleIntegrationModule } from "./integrations/google/google-integration.module";
import { AdSpendModule } from "./ad-spend/ad-spend.module";
import { ReportsModule } from "./reports/reports.module";
import { EmailTemplatesModule } from "./email-templates/email-templates.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { EmailSettingsModule } from "./email-settings/email-settings.module";
import { CustomTablesModule } from "./custom-tables/custom-tables.module";
import { EmailLogsModule } from "./email-logs/email-logs.module";
import { MktContactsModule } from "./mkt/mkt-contacts/mkt-contacts.module";
import { MktContactListsModule } from "./mkt/mkt-contact-lists/mkt-contact-lists.module";
import { MktTagsModule } from "./mkt/mkt-tags/mkt-tags.module";
import { MktCampaignsModule } from "./mkt/mkt-campaigns/mkt-campaigns.module";
import { MktLandingPageConfigModule } from "./mkt/mkt-landing-page-config/mkt-landing-page-config.module";
import { MktDashboardModule } from "./mkt/mkt-dashboard/mkt-dashboard.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    HealthModule,
    FieldDefinitionsModule,
    CandidatesModule,
    PipelineStagesModule,
    ViewsModule,
    AuditLogModule,
    StorageModule,
    LandingPagesModule,
    IngestionModule,
    CvAttachmentsModule,
    InterviewsModule,
    CommentsModule,
    AutomationModule,
    OfferLetterModule,
    GoogleIntegrationModule,
    AdSpendModule,
    ReportsModule,
    EmailTemplatesModule,
    NotificationsModule,
    EmailSettingsModule,
    CustomTablesModule,
    EmailLogsModule,
    MktContactsModule,
    MktContactListsModule,
    MktTagsModule,
    MktCampaignsModule,
    MktLandingPageConfigModule,
    MktDashboardModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

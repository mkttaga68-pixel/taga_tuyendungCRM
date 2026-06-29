import { Module } from "@nestjs/common";
import { GoogleTokenService } from "./google-token.service";
import { GoogleCalendarService } from "./google-calendar.service";
import { GoogleIntegrationController } from "./google-integration.controller";

@Module({
  controllers: [GoogleIntegrationController],
  providers: [GoogleTokenService, GoogleCalendarService],
  exports: [GoogleTokenService, GoogleCalendarService],
})
export class GoogleIntegrationModule {}

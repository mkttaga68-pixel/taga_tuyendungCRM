import { Module } from "@nestjs/common";
import { EmailSettingsController } from "./email-settings.controller";
import { EmailSettingsService } from "./email-settings.service";
import { ResendService } from "./resend.service";

@Module({
  controllers: [EmailSettingsController],
  providers: [EmailSettingsService, ResendService],
  exports: [ResendService],
})
export class EmailSettingsModule {}

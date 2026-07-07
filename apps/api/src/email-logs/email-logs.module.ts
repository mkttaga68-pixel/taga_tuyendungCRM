import { Module } from "@nestjs/common";
import { EmailLogsController } from "./email-logs.controller";
import { EmailLogsService } from "./email-logs.service";
import { EmailSettingsModule } from "../email-settings/email-settings.module";

@Module({
  imports: [EmailSettingsModule],
  controllers: [EmailLogsController],
  providers: [EmailLogsService],
  exports: [EmailLogsService],
})
export class EmailLogsModule {}

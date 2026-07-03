import { Body, Controller, Get, Post, Put, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { EmailSettingsService } from "./email-settings.service";
import { ResendService } from "./resend.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import type { AccessTokenPayload } from "@taga-crm/shared";

const saveEmailSettingsSchema = z.object({
  apiKey: z.string().min(1, "API key không được để trống"),
  fromEmail: z.string().email("Email gửi không hợp lệ"),
  fromName: z.string().min(1, "Tên người gửi không được để trống").max(100),
});
type SaveEmailSettingsInput = z.infer<typeof saveEmailSettingsSchema>;

@Controller("settings/email")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class EmailSettingsController {
  constructor(
    private readonly emailSettingsService: EmailSettingsService,
    private readonly resendService: ResendService,
  ) {}

  @Get()
  getStatus() {
    return this.emailSettingsService.getStatus();
  }

  @Put()
  async save(
    @Body(new ZodValidationPipe(saveEmailSettingsSchema)) body: SaveEmailSettingsInput,
  ) {
    await this.emailSettingsService.save(body);
    return this.emailSettingsService.getStatus();
  }

  @Post("test")
  async sendTest(@CurrentUser() user: AccessTokenPayload) {
    await this.resendService.send({
      to: user.email,
      subject: "Test email từ TAGA CRM",
      html: `<p>Email thử nghiệm gửi thành công từ <strong>TAGA CRM</strong>.</p><p>Nếu bạn nhận được email này, Resend đã được cấu hình đúng.</p>`,
    });
    return { success: true, sentTo: user.email };
  }
}

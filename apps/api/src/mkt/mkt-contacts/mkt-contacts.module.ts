import { Module } from "@nestjs/common";
import { MktContactsController } from "./mkt-contacts.controller";
import { MktContactsService } from "./mkt-contacts.service";

@Module({
  controllers: [MktContactsController],
  providers: [MktContactsService],
  exports: [MktContactsService],
})
export class MktContactsModule {}

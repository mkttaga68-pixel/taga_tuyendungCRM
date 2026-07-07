import { Module } from "@nestjs/common";
import { MktContactListsController } from "./mkt-contact-lists.controller";
import { MktContactListsService } from "./mkt-contact-lists.service";

@Module({
  controllers: [MktContactListsController],
  providers: [MktContactListsService],
  exports: [MktContactListsService],
})
export class MktContactListsModule {}

import { Module } from "@nestjs/common";
import { MktTagsController } from "./mkt-tags.controller";
import { MktTagsService } from "./mkt-tags.service";

@Module({
  controllers: [MktTagsController],
  providers: [MktTagsService],
  exports: [MktTagsService],
})
export class MktTagsModule {}

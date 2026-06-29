import { Module } from "@nestjs/common";
import { AdSpendService } from "./ad-spend.service";
import { AdSpendController } from "./ad-spend.controller";

@Module({
  controllers: [AdSpendController],
  providers: [AdSpendService],
})
export class AdSpendModule {}

import { Module } from "@nestjs/common";
import { CustomTablesController } from "./custom-tables.controller";
import { CustomTablesService } from "./custom-tables.service";

@Module({
  controllers: [CustomTablesController],
  providers: [CustomTablesService],
  exports: [CustomTablesService],
})
export class CustomTablesModule {}

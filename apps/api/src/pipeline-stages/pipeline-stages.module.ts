import { Module } from "@nestjs/common";
import { PipelineStagesController } from "./pipeline-stages.controller";

@Module({
  controllers: [PipelineStagesController],
})
export class PipelineStagesModule {}

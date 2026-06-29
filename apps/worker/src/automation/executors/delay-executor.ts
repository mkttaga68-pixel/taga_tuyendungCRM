import { delayConfigSchema, waitConfigSchema } from "@taga-crm/shared";
import type { NodeExecutor } from "../types";

const UNIT_TO_MS: Record<"seconds" | "minutes" | "hours", number> = {
  seconds: 1000,
  minutes: 60_000,
  hours: 3_600_000,
};

export const delayExecutor: NodeExecutor = async ({ node }) => {
  const config = delayConfigSchema.parse(node.config);
  const delayMs = config.amount * UNIT_TO_MS[config.unit];
  return { output: { delayMs }, delayMs };
};

export const waitExecutor: NodeExecutor = async ({ node }) => {
  const config = waitConfigSchema.parse(node.config);
  const delayMs = Math.max(0, new Date(config.untilDateTime).getTime() - Date.now());
  return { output: { untilDateTime: config.untilDateTime, delayMs }, delayMs };
};

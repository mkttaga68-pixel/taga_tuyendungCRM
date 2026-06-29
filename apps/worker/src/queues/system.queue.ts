export const SYSTEM_QUEUE_NAME = "system";

export interface PingJobData {
  requestedAt: string;
}

export interface PingJobResult {
  pong: true;
  respondedAt: string;
}

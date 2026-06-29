import IORedis from "ioredis";

/**
 * BullMQ yêu cầu maxRetriesPerRequest: null trên connection dùng cho Worker/Queue
 * (lệnh blocking BRPOPLPUSH... sẽ tự retry vô hạn theo cơ chế riêng của BullMQ).
 * https://docs.bullmq.io/guide/going-to-production#maxretriesperrequest
 */
export function createRedisConnection(): IORedis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL chưa được khai báo trong biến môi trường");
  }

  return new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
}

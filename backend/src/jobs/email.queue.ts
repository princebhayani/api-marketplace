import { Queue, type ConnectionOptions } from "bullmq";
import { redisClient } from "../config/redis";

// BullMQ expects IORedis-compatible connection; redis v4 client works at runtime
const connection = redisClient.duplicate() as unknown as ConnectionOptions;

export const emailQueue = new Queue("email-notifications", {
  connection,
});

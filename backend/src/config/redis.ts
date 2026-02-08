import { createClient } from "redis";
import { config } from "./env";
import { logger } from "../common/logger";

export const redisClient = createClient({
  url: config.redisUrl,
});

redisClient.on("error", (err) => {
  logger.error("Redis Client Error", err);
});

export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}


import { Redis } from "@upstash/redis";
import { logger } from "../core/logger.js";

export interface SessionValue {
  [key: string]: string | number | boolean | null | SessionValue | SessionValue[];
}

const SESSION_TTL_SECONDS = 3600;
const memoryStore = new Map<string, SessionValue>();

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

export async function getSession(key: string): Promise<SessionValue | null> {
  try {
    if (!redis) {
      return memoryStore.get(key) ?? null;
    }

    const result = await redis.get<SessionValue>(key);

    if (result) {
      return result;
    }

    return memoryStore.get(key) ?? null;
  } catch (error) {
    logger.warn({ error, key }, "Session read failed, using in-memory fallback");
    return memoryStore.get(key) ?? null;
  }
}

export async function setSession(key: string, value: SessionValue): Promise<void> {
  memoryStore.set(key, value);

  try {
    if (!redis) {
      return;
    }

    await redis.set(key, value, { ex: SESSION_TTL_SECONDS });
  } catch (error) {
    logger.warn({ error, key }, "Session write failed, kept in-memory fallback");
  }
}

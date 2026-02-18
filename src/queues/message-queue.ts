import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import config from "../config/env.js";
import type { NormalizedMessage } from "../types/index.js";
import { MessageRouter } from "../core/message-router.js";
import { logger } from "../core/logger.js";

const QUEUE_NAME = "message-processing";

const connection = new IORedis(config.REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
  tls: config.REDIS_URL.startsWith("rediss://") ? {} : undefined,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  reconnectOnError: (err) => {
    const targetErrors = ["EPIPE", "ECONNRESET", "ETIMEDOUT"];
    return targetErrors.some((e) => err.message.includes(e));
  },
});

connection.on("error", (err) => {
  logger.error({ err: err.message }, "Redis connection error");
});

export const messageQueue = new Queue(QUEUE_NAME, {
  // @ts-expect-error ioredis version mismatch between top-level (5.9.3) and bullmq bundled (5.9.2)
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 1000 }, // Keep last 1000 completed
    removeOnFail: { count: 5000 },
  },
});

/**
 * Start the queue worker. Call once on server startup.
 */
export function startWorker(router: MessageRouter): Worker<NormalizedMessage> {
  const worker = new Worker<NormalizedMessage>(
    QUEUE_NAME,
    async (job) => {
      logger.info(
        { jobId: job.id, channel: job.data.channelType },
        "Processing queued message"
      );
      await router.processMessage(job.data);
    },
    {
      // @ts-expect-error ioredis version mismatch between top-level (5.9.3) and bullmq bundled (5.9.2)
      connection,
      concurrency: 5, // Process 5 messages in parallel
      limiter: {
        max: 20, // Max 20 jobs per 1 second (WhatsApp rate limit safe)
        duration: 1000,
      },
    }
  );

  worker.on("completed", (job) => {
    logger.debug({ jobId: job.id }, "Job completed");
  });

  worker.on("failed", (job, error) => {
    logger.error({ jobId: job?.id, error: error.message }, "Job failed");
  });

  logger.info("Message queue worker started");
  return worker;
}

/**
 * Enqueue a message for async processing.
 * Returns immediately — webhook can respond 200 fast.
 */
export async function enqueueMessage(msg: NormalizedMessage): Promise<void> {
  await messageQueue.add("process-message", msg, {
    priority: msg.channelType === "WHATSAPP" ? 1 : 2, // WhatsApp highest priority
  });
}

/**
 * Gracefully close queue, worker, and Redis connection.
 */
export async function closeQueue(worker?: Worker): Promise<void> {
  if (worker) await worker.close();
  await messageQueue.close();
  await connection.quit();
}

import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { config } from "../config/env.js";
import type { NormalizedMessage } from "../types/index.js";
import { MessageRouter } from "../core/message-router.js";
import { logger } from "../core/logger.js";

const QUEUE_NAME = "message-processing";

// Redis connection is optional - if not configured, queue operations will be skipped
let connection: IORedis | null = null;
let messageQueue: Queue<NormalizedMessage> | null = null;
let isInitialized = false;

/**
 * Initialize Redis connection and message queue
 * Called asynchronously during server startup
 */
export async function initializeQueue(): Promise<void> {
  if (isInitialized) return;
  isInitialized = true;

  if (!config.REDIS_URL) {
    logger.info("REDIS_URL not configured - message queue disabled, using synchronous processing");
    return;
  }

  try {
    connection = new IORedis(config.REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
      tls: config.REDIS_URL.startsWith("rediss://") ? {} : undefined,
      retryStrategy: (times) => {
        // Limit retries to avoid flooding logs
        if (times > 10) {
          logger.warn("Redis connection failed after 10 retries, giving up");
          return null; // Stop retrying
        }
        return Math.min(times * 50, 2000);
      },
      reconnectOnError: (err) => {
        const targetErrors = ["EPIPE", "ECONNRESET", "ETIMEDOUT"];
        return targetErrors.some((e) => err.message.includes(e));
      },
      lazyConnect: true, // Don't connect immediately
    });

    connection.on("error", (err) => {
      logger.error({ err: err.message }, "Redis connection error");
    });

    connection.on("ready", () => {
      logger.info("Redis connection established");
    });

    // Try to connect
    await connection.connect();

    // Initialize queue only if connection succeeded
    messageQueue = new Queue(QUEUE_NAME, {
      // @ts-expect-error ioredis version mismatch between top-level (5.9.3) and bullmq bundled (5.9.2)
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { count: 1000 }, // Keep last 1000 completed
        removeOnFail: { count: 5000 },
      },
    });
    logger.info("Message queue initialized");
  } catch (error) {
    logger.warn(
      { error: error instanceof Error ? error.message : String(error) },
      "Redis connection failed - queue disabled, using synchronous processing"
    );
    connection = null;
    messageQueue = null;
  }
}

/**
 * Start the queue worker. Call once on server startup.
 * Returns null if Redis is not configured.
 */
export function startWorker(router: MessageRouter): Worker<NormalizedMessage> | null {
  if (!connection || !messageQueue) {
    logger.info("Redis not available - worker not started");
    return null;
  }

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
 * If Redis is not available, throws an error (caller should handle synchronously).
 */
export async function enqueueMessage(msg: NormalizedMessage): Promise<void> {
  if (!messageQueue) {
    throw new Error("Message queue not available - Redis not configured");
  }
  await messageQueue.add("process-message", msg, {
    priority: msg.channelType === "WHATSAPP" ? 1 : 2, // WhatsApp highest priority
  });
}

/**
 * Gracefully close queue, worker, and Redis connection.
 */
export async function closeQueue(worker?: Worker | null): Promise<void> {
  if (worker) await worker.close();
  if (messageQueue) await messageQueue.close();
  if (connection) await connection.quit();
}

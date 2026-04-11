import Fastify from "fastify";
import { Prisma } from "@prisma/client";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config/env.js";
import { logger } from "./core/logger.js";
import { MessageRouter } from "./core/message-router.js";
import { TwilioWhatsAppAdapter } from "./channels/whatsapp-twilio.js";
import type { MetaWebhookBody } from "./channels/whatsapp-twilio.js";
import { enqueueMessage, startWorker, closeQueue } from "./queues/message-queue.js";
import { prisma } from "./db/client.js";

async function main() {
  // ── Production environment guard ────────────────────
  // Railway sets RAILWAY_ENVIRONMENT automatically. If deployed there but
  // NODE_ENV is not "production", the process refuses to start — avoids
  // silent misconfig where dev settings run against production infrastructure.
  if (process.env.RAILWAY_ENVIRONMENT !== undefined && config.NODE_ENV !== "production") {
    logger.fatal(
      {
        NODE_ENV: config.NODE_ENV,
        RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
      },
      "NODE_ENV must be 'production' in Railway deployment. " +
        "Set NODE_ENV=production in Railway service variables and redeploy."
    );
    process.exit(1);
  }

  // ── Initialize Fastify ──────────────────────────────
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport:
        config.NODE_ENV === "development"
          ? { target: "pino-pretty" }
          : undefined,
    },
  });

  await app.register(cors, { origin: true });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // ── Initialize adapters & router ────────────────────
  const whatsappAdapter = new TwilioWhatsAppAdapter();
  const router = new MessageRouter();
  router.registerAdapter(whatsappAdapter);

  // Start BullMQ worker (store ref for graceful shutdown)
  const worker = startWorker(router);

  // ── Health check ────────────────────────────────────
  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date(),
    uptime: process.uptime(),
    provider: "meta",
  }));

  app.get("/webhooks/whatsapp", async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;

    if (
      query["hub.mode"] === "subscribe" &&
      query["hub.verify_token"] === config.WHATSAPP_VERIFY_TOKEN
    ) {
      return reply.status(200).send(query["hub.challenge"] ?? "");
    }

    return reply.status(403).send("Forbidden");
  });

  // ── Meta WhatsApp webhook (POST) ───────────────────
  app.post<{ Body: MetaWebhookBody }>(
    "/webhooks/whatsapp",
    async (request, reply) => {
      const body = request.body;

      prisma.webhookLog.create({
        data: {
          channel: "WHATSAPP",
          eventType: "meta_message",
          payload: body as Prisma.InputJsonValue,
        },
      }).catch((err: unknown) =>
        logger.warn({ err }, "Failed to log webhook (DB may be sleeping)"),
      );

      const normalized = whatsappAdapter.parseTwilioWebhook(body);

      if (!normalized) {
        return reply.status(200).send({ received: true });
      }

      void (async () => {
        try {
          await enqueueMessage(normalized);
        } catch (enqueueError) {
          logger.error({ enqueueError }, "Failed to enqueue message — Redis may be down");
        }
      })();

      return reply.status(200).send({ received: true });
    }
  );

  // ── Seed demo client config ─────────────────────────
  app.get("/setup/seed-demo", async (request, reply) => {
    // Route is disabled unless ADMIN_SECRET is explicitly configured.
    // In production this is guaranteed by the Zod superRefine check in env.ts.
    if (!config.ADMIN_SECRET) {
      return reply.status(404).send({ error: "Not found" });
    }
    const secret = request.headers["x-admin-secret"] as string;
    if (secret !== config.ADMIN_SECRET) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    const existing = await prisma.clientConfig.findUnique({
      where: { clientId: "shadowspark-demo" },
    });

    if (existing) return { message: "Demo config already exists", config: existing };

    const demo = await prisma.clientConfig.create({
      data: {
        clientId: "shadowspark-demo",
        businessName: "ShadowSpark Demo",
        systemPrompt: `You are a friendly AI assistant for a Nigerian business.

Your role:
- Answer customer questions about products and services
- Help with order inquiries and status checks
- Collect customer contact information when appropriate
- Be warm, professional, and use Nigerian English naturally
- Keep responses concise (under 200 words)
- If you can't help, offer to connect them with a human agent

When greeting, be warm: "Hello! Welcome to [Business Name]. How can I help you today?"
For pricing, always use Naira (₦).
Understand Pidgin English if customers use it.`,
        welcomeMessage: "Hello! 👋 Welcome! How can I help you today?",
        fallbackMessage:
          "I'm sorry, I didn't quite understand that. Could you rephrase? Or type 'agent' to speak with someone.",
        channels: { whatsapp: true, telegram: false, web: false },
      },
    });

    return { message: "Demo config created", config: demo };
  });

  // ── Start server ────────────────────────────────────
  try {
    await app.listen({ port: config.PORT, host: "0.0.0.0" });
    logger.info(`🚀 ShadowSpark Chatbot running on port ${config.PORT}`);
    logger.info(`📱 WhatsApp webhook (Meta): GET/POST /webhooks/whatsapp`);
    logger.info(`❤️  Health check: GET /health`);
  } catch (error) {
    logger.fatal({ error }, "Server failed to start");
    process.exit(1);
  }

  // ── Graceful shutdown ─────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutdown signal received, closing gracefully...");
    try {
      await app.close();
      await closeQueue(worker);
      await prisma.$disconnect();
      logger.info("Shutdown complete");
      process.exit(0);
    } catch (error) {
      logger.error({ error }, "Error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((error) => {
  console.error("Fatal startup error:", error);
  process.exit(1);
});

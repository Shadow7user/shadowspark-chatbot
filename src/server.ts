import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config/env.js";
import { logger } from "./core/logger.js";
import { MessageRouter } from "./core/message-router.js";
import { TwilioWhatsAppAdapter } from "./channels/whatsapp-twilio.js";
import type { TwilioWebhookBody } from "./channels/whatsapp-twilio.js";
import { enqueueMessage, startWorker, closeQueue, isRedisReady } from "./queues/message-queue.js";
import { prisma } from "./db/client.js";
import twilio from "twilio";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

// ── Unhandled rejection / exception guards ───────────
process.on("unhandledRejection", (reason, promise) => {
  logger.error({ reason, promise }, "Unhandled promise rejection");
});

process.on("uncaughtException", (error) => {
  logger.fatal({ error }, "Uncaught exception — shutting down");
  process.exit(1);
});

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

  // ── Verify database connection on boot ──────────────
  let dbStatus = "connected";
  try {
    await prisma.$connect();
    logger.info("✅ Database connected successfully");
  } catch (dbError) {
    dbStatus = "failed";
    logger.fatal({ dbError }, "❌ Database connection failed — cannot start server");
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

  // Parse URL-encoded bodies (Twilio sends form data)
  app.addContentTypeParser(
    "application/x-www-form-urlencoded",
    { parseAs: "string", bodyLimit: 10_000 },
    (req, body, done) => {
      const parsed = Object.fromEntries(new URLSearchParams(body as string));
      done(null, parsed);
    }
  );

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
    provider: "twilio",
  }));

  // ── Twilio WhatsApp webhook (POST) ─────────────────
  app.post<{ Body: TwilioWebhookBody }>(
    "/webhooks/whatsapp",
    async (request, reply) => {
      try {
        const body = request.body;

        // Validate request is from Twilio
        const twilioSignature = request.headers["x-twilio-signature"] as string;
        const webhookUrl = config.WEBHOOK_BASE_URL
          ? `${config.WEBHOOK_BASE_URL}/webhooks/whatsapp`
          : `http://localhost:${config.PORT}/webhooks/whatsapp`;

        const isValid = twilio.validateRequest(
          config.TWILIO_AUTH_TOKEN,
          twilioSignature || "",
          webhookUrl,
          body as Record<string, string>
        );

        if (!isValid && config.NODE_ENV === "production") {
          logger.warn("Invalid Twilio signature");
          return reply.status(403).send("Forbidden");
        }

        // ── Diagnostic mode triggers (post-auth) ────────
        // Protected by Twilio signature validation in production.
        // Rate-limited globally to 100 req/min by @fastify/rate-limit.
        if (body.Body === "PING_WEBHOOK") {
          reply.header("Content-Type", "text/plain");
          return reply.send("Webhook reachable");
        }

        if (body.Body === "PING_OPENAI") {
          try {
            await generateText({
              model: openai("gpt-4o-mini"),
              messages: [{ role: "user", content: "ping" }],
              maxTokens: 5,
            });
            reply.header("Content-Type", "text/plain");
            return reply.send("OpenAI Connected");
          } catch (openaiError) {
            const msg = openaiError instanceof Error ? openaiError.message : String(openaiError);
            logger.error({ openaiError }, "PING_OPENAI diagnostic failed");
            reply.header("Content-Type", "text/plain");
            return reply.send(`OpenAI Error: ${msg}`);
          }
        }

        // Log webhook for debugging (non-blocking — don't let DB failures kill the handler)
        prisma.webhookLog.create({
          data: {
            channel: "WHATSAPP",
            eventType: "twilio_message",
            payload: body as Record<string, string | undefined>,
          },
        }).catch((err) => logger.warn({ err }, "Failed to log webhook (DB may be sleeping)"));

        // Parse into normalized message
        const normalized = whatsappAdapter.parseTwilioWebhook(body);
        if (!normalized) {
          // Return empty TwiML
          reply.header("Content-Type", "text/xml");
          return reply.send("<Response></Response>");
        }

        // Enqueue for async AI processing
        try {
          await enqueueMessage(normalized);
        } catch (enqueueError) {
          logger.error({ enqueueError }, "Failed to enqueue message — Redis may be down");
        }

        // Return empty TwiML (response sent async via API)
        reply.header("Content-Type", "text/xml");
        return reply.send("<Response></Response>");
      } catch (error) {
        logger.error({ error }, "Twilio webhook processing error");
        reply.header("Content-Type", "text/xml");
        return reply.send("<Response></Response>");
      }
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

    // ── Startup log block ────────────────────────────
    logger.info(
      {
        environment: config.NODE_ENV,
        port: config.PORT,
        redisStatus: isRedisReady() ? "connected" : "connecting",
        databaseStatus: dbStatus,
        openAiKeyLoaded: Boolean(config.OPENAI_API_KEY),
        webhookRouteRegistered: "POST /webhooks/whatsapp",
      },
      "🚀 ShadowSpark Chatbot startup complete"
    );
    logger.info(`📱 WhatsApp webhook (Twilio): POST /webhooks/whatsapp`);
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

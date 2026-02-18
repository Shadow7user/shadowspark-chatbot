import Fastify from "fastify";
import type { FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config/env.js";
import { logger } from "./core/logger.js";
import { MessageRouter } from "./core/message-router.js";
import { TwilioWhatsAppAdapter } from "./channels/whatsapp-twilio.js";
import type { TwilioWebhookBody } from "./channels/whatsapp-twilio.js";
import { enqueueMessage, startWorker, closeQueue } from "./queues/message-queue.js";
import { prisma } from "./db/client.js";
import twilio from "twilio";
import {
  getPendingEscalations,
  assignEscalation,
  markInProgress,
  resolveEscalation,
  getEscalationStats,
} from "./core/admin-queue.js";
import { getClientAnalytics, getTopIntents } from "./core/analytics-logger.js";

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

  // ── Admin Escalation Queue Endpoints ───────────────
  // Note: These endpoints are protected by:
  // 1. Global rate limiter (100 req/min) applied to all routes
  // 2. Admin authentication via x-admin-secret header
  // This provides adequate protection against abuse while keeping route config simple
  
  // Helper: Check admin auth
  const checkAdminAuth = (request: FastifyRequest, reply: FastifyReply): boolean => {
    if (!config.ADMIN_SECRET) {
      reply.status(404).send({ error: "Not found" });
      return false;
    }
    const secret = request.headers["x-admin-secret"] as string;
    if (secret !== config.ADMIN_SECRET) {
      reply.status(401).send({ error: "Unauthorized" });
      return false;
    }
    return true;
  };

  // Get pending escalations
  app.get(
    "/admin/escalations",
    async (request, reply) => {
      if (!checkAdminAuth(request, reply)) return;

      const { queueType, limit } = request.query as {
        queueType?: string;
        limit?: string;
      };

      const escalations = await getPendingEscalations(
        queueType as any,
        limit ? parseInt(limit) : 50
      );

      return { escalations, count: escalations.length };
    }
  );

  // Get escalation statistics
  app.get(
    "/admin/escalations/stats",
    async (request, reply) => {
      if (!checkAdminAuth(request, reply)) return;

      const { queueType } = request.query as { queueType?: string };
      const stats = await getEscalationStats(queueType as any);

      return { stats };
    }
  );

  // Assign escalation to admin
  app.post<{ Params: { id: string }; Body: { assignedTo: string } }>(
    "/admin/escalations/:id/assign",
    async (request, reply) => {
      if (!checkAdminAuth(request, reply)) return;

      const { id } = request.params;
      const { assignedTo } = request.body;

      if (!assignedTo) {
        return reply.status(400).send({ error: "assignedTo is required" });
      }

      const escalation = await assignEscalation(id, assignedTo);
      if (!escalation) {
        return reply.status(404).send({ error: "Escalation not found" });
      }

      return { escalation };
    }
  );

  // Mark escalation as in progress
  app.post<{ Params: { id: string } }>(
    "/admin/escalations/:id/progress",
    async (request, reply) => {
      if (!checkAdminAuth(request, reply)) return;

      const { id } = request.params;
      const success = await markInProgress(id);

      if (!success) {
        return reply.status(404).send({ error: "Escalation not found" });
      }

      return { message: "Escalation marked in progress" };
    }
  );

  // Resolve escalation
  app.post<{ Params: { id: string } }>(
    "/admin/escalations/:id/resolve",
    async (request, reply) => {
      if (!checkAdminAuth(request, reply)) return;

      const { id } = request.params;
      const success = await resolveEscalation(id);

      if (!success) {
        return reply.status(404).send({ error: "Escalation not found" });
      }

      return { message: "Escalation resolved" };
    }
  );

  // ── Analytics Endpoints ─────────────────────────────
  // Get client analytics
  app.get(
    "/analytics/client/:clientId",
    async (request, reply) => {
      if (!checkAdminAuth(request, reply)) return;

      const { clientId } = request.params as { clientId: string };
      const { startDate, endDate } = request.query as {
        startDate?: string;
        endDate?: string;
      };

      const analytics = await getClientAnalytics(
        clientId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );

      return { clientId, analytics };
    }
  );

  // Get top intents for a client
  app.get(
    "/analytics/intents/:clientId",
    async (request, reply) => {
      if (!checkAdminAuth(request, reply)) return;

      const { clientId } = request.params as { clientId: string };
      const { limit, startDate } = request.query as {
        limit?: string;
        startDate?: string;
      };

      const topIntents = await getTopIntents(
        clientId,
        limit ? parseInt(limit) : 5,
        startDate ? new Date(startDate) : undefined
      );

      return { clientId, topIntents };
    }
  );

  // Get overall analytics dashboard
  app.get(
    "/analytics/dashboard",
    async (request, reply) => {
      if (!checkAdminAuth(request, reply)) return;

      const { startDate, endDate } = request.query as {
        startDate?: string;
        endDate?: string;
      };

      const dateFilter = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };

      const [
        totalConversations,
        totalMessages,
        conversationsByIntent,
        avgResponseTime,
      ] = await Promise.all([
        prisma.conversationAnalytics.count({
          where: startDate || endDate ? { createdAt: dateFilter } : {},
        }),
        prisma.conversationAnalytics.aggregate({
          where: startDate || endDate ? { createdAt: dateFilter } : {},
          _sum: { messageCount: true },
        }),
        prisma.conversationAnalytics.groupBy({
          by: ["intent"],
          where: startDate || endDate ? { createdAt: dateFilter } : {},
          _count: { id: true },
        }),
        prisma.conversationAnalytics.aggregate({
          where: startDate || endDate ? { createdAt: dateFilter } : {},
          _avg: { avgResponseTimeMs: true },
        }),
      ]);

      return {
        totalConversations,
        totalMessages: totalMessages._sum.messageCount ?? 0,
        avgResponseTimeMs: Math.round(avgResponseTime._avg.avgResponseTimeMs ?? 0),
        conversationsByIntent,
      };
    }
  );

  // ── Start server ────────────────────────────────────
  try {
    await app.listen({ port: config.PORT, host: "0.0.0.0" });
    logger.info(`🚀 ShadowSpark Chatbot running on port ${config.PORT}`);
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

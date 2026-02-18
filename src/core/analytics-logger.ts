import { prisma } from "../db/client.js";
import type { IntentType } from "@prisma/client";
import { logger } from "./logger.js";

export interface AnalyticsEvent {
  conversationId: string;
  clientId: string;
  intent?: IntentType;
  sentiment?: string;
  tokensUsed?: number;
  costUsed?: number;
  responseTimeMs?: number;
}

/**
 * Initializes or updates conversation analytics
 */
export async function recordAnalytics(event: AnalyticsEvent): Promise<void> {
  try {
    const existing = await prisma.conversationAnalytics.findUnique({
      where: { conversationId: event.conversationId },
    });

    const now = new Date();

    if (existing) {
      // Update existing analytics
      await prisma.conversationAnalytics.update({
        where: { conversationId: event.conversationId },
        data: {
          messageCount: { increment: 1 },
          userMessageCount: { increment: 1 },
          intent: event.intent ?? existing.intent,
          sentiment: event.sentiment ?? existing.sentiment,
          totalTokensUsed: { increment: event.tokensUsed ?? 0 },
          totalCostUsed: { increment: event.costUsed ?? 0 },
          avgResponseTimeMs: event.responseTimeMs
            ? Math.round(
                (existing.avgResponseTimeMs ?? 0) * 0.8 + event.responseTimeMs * 0.2
              )
            : existing.avgResponseTimeMs,
          lastMessageAt: now,
          updatedAt: now,
        },
      });
    } else {
      // Create new analytics record
      await prisma.conversationAnalytics.create({
        data: {
          conversationId: event.conversationId,
          clientId: event.clientId,
          messageCount: 1,
          userMessageCount: 1,
          aiMessageCount: 0,
          intent: event.intent,
          sentiment: event.sentiment,
          totalTokensUsed: event.tokensUsed ?? 0,
          totalCostUsed: event.costUsed ?? 0,
          avgResponseTimeMs: event.responseTimeMs,
          firstMessageAt: now,
          lastMessageAt: now,
        },
      });
    }

    logger.debug(
      {
        conversationId: event.conversationId,
        intent: event.intent,
        tokensUsed: event.tokensUsed,
      },
      "Analytics recorded"
    );
  } catch (error) {
    // Non-blocking - log error but don't throw
    logger.warn({ error, conversationId: event.conversationId }, "Failed to record analytics");
  }
}

/**
 * Records an AI response in analytics
 */
export async function recordAIResponse(
  conversationId: string,
  tokensUsed: number,
  costUsed: number
): Promise<void> {
  try {
    await prisma.conversationAnalytics.update({
      where: { conversationId },
      data: {
        messageCount: { increment: 1 },
        aiMessageCount: { increment: 1 },
        totalTokensUsed: { increment: tokensUsed },
        totalCostUsed: { increment: costUsed },
        lastMessageAt: new Date(),
      },
    });
  } catch (error) {
    logger.warn({ error, conversationId }, "Failed to record AI response analytics");
  }
}

/**
 * Records handoff reason in analytics
 */
export async function recordHandoff(
  conversationId: string,
  reason: string
): Promise<void> {
  try {
    await prisma.conversationAnalytics.update({
      where: { conversationId },
      data: {
        handoffReason: reason,
      },
    });

    logger.debug({ conversationId, reason }, "Handoff recorded in analytics");
  } catch (error) {
    logger.warn({ error, conversationId }, "Failed to record handoff analytics");
  }
}

/**
 * Gets analytics summary for a client over a date range
 */
export async function getClientAnalytics(
  clientId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalConversations: number;
  totalMessages: number;
  totalTokensUsed: number;
  totalCostUsed: number;
  avgResponseTimeMs: number;
  intentBreakdown: Record<string, number>;
  handoffCount: number;
}> {
  try {
    const where = {
      clientId,
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            },
          }
        : {}),
    };

    const [analytics, intentCounts] = await Promise.all([
      prisma.conversationAnalytics.aggregate({
        where,
        _count: { id: true },
        _sum: {
          messageCount: true,
          totalTokensUsed: true,
          totalCostUsed: true,
        },
        _avg: {
          avgResponseTimeMs: true,
        },
      }),
      prisma.conversationAnalytics.groupBy({
        by: ["intent"],
        where,
        _count: { id: true },
      }),
    ]);

    const handoffCount = await prisma.conversationAnalytics.count({
      where: {
        ...where,
        handoffReason: { not: null },
      },
    });

    const intentBreakdown: Record<string, number> = {};
    intentCounts.forEach((item) => {
      if (item.intent) {
        intentBreakdown[item.intent] = item._count.id;
      }
    });

    return {
      totalConversations: analytics._count.id,
      totalMessages: analytics._sum.messageCount ?? 0,
      totalTokensUsed: analytics._sum.totalTokensUsed ?? 0,
      totalCostUsed: analytics._sum.totalCostUsed ?? 0,
      avgResponseTimeMs: Math.round(analytics._avg.avgResponseTimeMs ?? 0),
      intentBreakdown,
      handoffCount,
    };
  } catch (error) {
    logger.error({ error, clientId }, "Failed to get client analytics");
    return {
      totalConversations: 0,
      totalMessages: 0,
      totalTokensUsed: 0,
      totalCostUsed: 0,
      avgResponseTimeMs: 0,
      intentBreakdown: {},
      handoffCount: 0,
    };
  }
}

/**
 * Gets analytics for a specific conversation
 */
export async function getConversationAnalytics(conversationId: string) {
  try {
    return await prisma.conversationAnalytics.findUnique({
      where: { conversationId },
    });
  } catch (error) {
    logger.error({ error, conversationId }, "Failed to get conversation analytics");
    return null;
  }
}

/**
 * Gets top intents for a client in a time period
 */
export async function getTopIntents(
  clientId: string,
  limit: number = 5,
  startDate?: Date
): Promise<Array<{ intent: IntentType; count: number; percentage: number }>> {
  try {
    const where = {
      clientId,
      intent: { not: null },
      ...(startDate && { createdAt: { gte: startDate } }),
    };

    const [intentCounts, total] = await Promise.all([
      prisma.conversationAnalytics.groupBy({
        by: ["intent"],
        where,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: limit,
      }),
      prisma.conversationAnalytics.count({ where }),
    ]);

    return intentCounts
      .filter((item): item is typeof item & { intent: IntentType } => item.intent !== null)
      .map((item) => ({
        intent: item.intent,
        count: item._count.id,
        percentage: total > 0 ? Math.round((item._count.id / total) * 100) : 0,
      }));
  } catch (error) {
    logger.error({ error, clientId }, "Failed to get top intents");
    return [];
  }
}

import type { NormalizedMessage, ChannelAdapter } from "../types/index.js";
import { ConversationManager } from "./conversation-manager.js";
import { AIBrain } from "./ai-brain.js";
import { config } from "../config/env.js";
import { logger } from "./logger.js";
import { classifyIntent, shouldEscalate, requiresHumanAttention } from "./intent-classifier.js";
import { computeMessagePriority, getEscalationQueueType } from "./priority-router.js";
import {
  estimateContextTokens,
  estimateCost,
  checkCostGuard,
  incrementCostUsage,
  getCostLimitMessage,
} from "./cost-guard.js";
import { createEscalation, hasActiveEscalation } from "./admin-queue.js";
import { recordAnalytics, recordAIResponse, recordHandoff } from "./analytics-logger.js";
import { prisma } from "../db/client.js";

// Keywords that trigger human handoff — matched case-insensitively as whole words.
const HANDOFF_PATTERN = /\b(agent|human|support)\b/i;

export class MessageRouter {
  private conversationManager = new ConversationManager();
  private aiBrain = new AIBrain();
  private adapters = new Map<string, ChannelAdapter>();

  registerAdapter(adapter: ChannelAdapter): void {
    this.adapters.set(adapter.channelType, adapter);
    logger.info({ channel: adapter.channelType }, "Channel adapter registered");
  }

  /**
   * Process an incoming normalized message end-to-end.
   * 1. Resolve user + conversation
   * 2. Dedup check
   * 3. Load context
   * 4. Intent classification
   * 5. Priority calculation
   * 6. Handoff detection (keywords + intent-based)
   * 7. Cost guard (before AI call)
   * 8. Token limit guard
   * 9. AI generation + usage tracking
   * 10. Send response
   * 11. Analytics logging
   */
  async processMessage(msg: NormalizedMessage): Promise<void> {
    const startTime = Date.now();

    try {
      // 1. Resolve user
      const userId = await this.conversationManager.resolveUser(msg);

      // Get user info for VIP status
      const user = await prisma.chatUser.findUnique({
        where: { id: userId },
        select: { isVip: true },
      });
      const isVipUser = user?.isVip ?? false;

      // 2. Resolve conversation
      const conversationId = await this.conversationManager.resolveConversation(
        userId,
        msg.channelType,
        config.DEFAULT_CLIENT_ID
      );

      // 3. Save user message (unique constraint on channelMessageId acts as dedup lock)
      const saved = await this.conversationManager.saveUserMessage(
        conversationId,
        msg.text,
        msg.channelMessageId
      );
      if (!saved) {
        logger.warn({ messageId: msg.channelMessageId }, "Duplicate message, skipping");
        return;
      }

      // 4. Load context (includes conversationStatus, handoffMessage, token counters)
      const context = await this.conversationManager.loadContext(
        conversationId,
        config.DEFAULT_CLIENT_ID
      );

      // 4a. Classify intent
      const intentClassification = classifyIntent(msg.text);
      logger.info(
        {
          conversationId,
          intent: intentClassification.intent,
          confidence: intentClassification.confidence,
        },
        "Intent classified"
      );

      // 4b. Compute priority
      const priorityScore = computeMessagePriority(
        intentClassification.intent,
        intentClassification.confidence,
        isVipUser,
        context.messages.length
      );

      // Update the saved message with intent and priority
      await prisma.message.updateMany({
        where: {
          conversationId,
          channelMessageId: msg.channelMessageId,
        },
        data: {
          intent: intentClassification.intent,
          confidence: intentClassification.confidence,
          priority: priorityScore.priority,
        },
      });

      // 4c. Record analytics for user message
      recordAnalytics({
        conversationId,
        clientId: context.clientId,
        intent: intentClassification.intent,
        responseTimeMs: Date.now() - startTime,
      }).catch((err) => logger.warn({ err }, "Failed to record initial analytics"));

      // 5. Resolve channel adapter early — needed by all branches below
      const adapter = this.adapters.get(msg.channelType);
      if (!adapter) {
        logger.error({ channel: msg.channelType }, "No adapter for channel");
        return;
      }

      // ── Handoff: already escalated ──────────────────────────────────────────
      // Message is saved above so the human agent can read it. No automated reply.
      if (context.conversationStatus === "HANDOFF") {
        logger.info(
          { conversationId, channel: msg.channelType },
          "Message received in HANDOFF state — saved for agent, no automated reply"
        );
        return;
      }

      // ── Handoff: keyword trigger or intent-based escalation ────────────────
      const needsEscalation =
        HANDOFF_PATTERN.test(msg.text) ||
        shouldEscalate(intentClassification.intent, intentClassification.confidence) ||
        requiresHumanAttention(intentClassification.intent, context.messages.length);

      if (needsEscalation) {
        await this.conversationManager.setHandoffStatus(conversationId);
        await this.conversationManager.saveAIResponse(conversationId, context.handoffMessage);
        await adapter.sendMessage(msg.channelUserId, context.handoffMessage);

        // Create escalation queue entry if not already exists
        const hasEscalation = await hasActiveEscalation(conversationId);
        if (!hasEscalation) {
          const queueType = getEscalationQueueType(intentClassification.intent);
          await createEscalation(
            conversationId,
            queueType,
            priorityScore.priority,
            priorityScore.reason
          );
          logger.info(
            {
              conversationId,
              queueType,
              priority: priorityScore.priority,
            },
            "Escalation queue entry created"
          );
        }

        // Record handoff in analytics
        recordHandoff(conversationId, priorityScore.reason).catch((err) =>
          logger.warn({ err }, "Failed to record handoff analytics")
        );

        logger.info(
          { conversationId, channel: msg.channelType, intent: intentClassification.intent },
          "Conversation escalated to HANDOFF"
        );
        return;
      }

      // ── Cost guard (check before AI call) ──────────────────────────────────
      const contextTokens = estimateContextTokens(context.messages);
      const costEstimate = estimateCost(contextTokens);
      const costGuardResult = await checkCostGuard(
        context.clientId,
        costEstimate.estimatedCost
      );

      if (!costGuardResult.allowed) {
        const limitMsg = getCostLimitMessage(costGuardResult.reason ?? "Cost limit reached");
        await this.conversationManager.saveAIResponse(conversationId, limitMsg);
        await adapter.sendMessage(msg.channelUserId, limitMsg);
        logger.warn(
          {
            conversationId,
            clientId: context.clientId,
            reason: costGuardResult.reason,
            estimatedCost: costGuardResult.estimatedCost,
          },
          "Cost limit would be exceeded — AI call skipped"
        );
        return;
      }

      // ── Token limit guard ───────────────────────────────────────────────────
      if (context.monthlyTokenUsage >= context.tokenUsageLimit) {
        const limitMsg =
          "Our automated assistant is temporarily unavailable. " +
          "Please contact us directly for assistance.";
        await this.conversationManager.saveAIResponse(conversationId, limitMsg);
        await adapter.sendMessage(msg.channelUserId, limitMsg);
        logger.warn(
          {
            conversationId,
            clientId: context.clientId,
            monthlyTokenUsage: context.monthlyTokenUsage,
            tokenUsageLimit: context.tokenUsageLimit,
          },
          "Monthly token limit exceeded — AI call skipped"
        );
        return;
      }

      // ── AI response ─────────────────────────────────────────────────────────
      const result = await this.aiBrain.generateResponse(context);
      await this.conversationManager.saveAIResponse(conversationId, result.response);

      // Calculate actual cost
      const actualCost = result.tokensUsed ? result.tokensUsed * 0.0000015 : 0;

      // Increment token counter — non-blocking, failure is logged and swallowed
      if (result.tokensUsed) {
        this.conversationManager
          .incrementTokenUsage(context.clientId, result.tokensUsed)
          .catch((err) =>
            logger.warn({ err, clientId: context.clientId }, "Failed to update token usage")
          );

        // Increment cost usage
        incrementCostUsage(context.clientId, actualCost).catch((err) =>
          logger.warn({ err, clientId: context.clientId }, "Failed to update cost usage")
        );

        // Record AI response in analytics
        recordAIResponse(conversationId, result.tokensUsed, actualCost).catch((err) =>
          logger.warn({ err }, "Failed to record AI response analytics")
        );
      }

      await adapter.sendMessage(msg.channelUserId, result.response);

      const totalLatency = Date.now() - startTime;
      logger.info(
        {
          conversationId,
          channel: msg.channelType,
          intent: intentClassification.intent,
          priority: priorityScore.priority,
          totalLatencyMs: totalLatency,
          tokensUsed: result.tokensUsed,
          costUsed: actualCost,
        },
        "Message processed successfully"
      );
    } catch (error) {
      logger.error(
        { error, channelUserId: msg.channelUserId, channel: msg.channelType },
        "Message processing failed"
      );
    }
  }
}

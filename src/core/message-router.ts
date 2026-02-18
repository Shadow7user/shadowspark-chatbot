import type { NormalizedMessage, ChannelAdapter } from "../types/index.js";
import { ConversationManager } from "./conversation-manager.js";
import { AIBrain } from "./ai-brain.js";
import config from "../config/env.js";
import { logger } from "./logger.js";

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
   * 4. Handoff detection (keywords: agent / human / support)
   * 5. Token limit guard
   * 6. AI generation + token usage increment
   * 7. Send response
   */
  async processMessage(msg: NormalizedMessage): Promise<void> {
    const startTime = Date.now();

    try {
      // 1. Resolve user
      const userId = await this.conversationManager.resolveUser(msg);

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

      // ── Handoff: keyword trigger ────────────────────────────────────────────
      if (HANDOFF_PATTERN.test(msg.text)) {
        await this.conversationManager.setHandoffStatus(conversationId);
        await this.conversationManager.saveAIResponse(conversationId, context.handoffMessage);
        await adapter.sendMessage(msg.channelUserId, context.handoffMessage);
        logger.info(
          { conversationId, channel: msg.channelType },
          "Conversation escalated to HANDOFF"
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

      // Increment token counter — non-blocking, failure is logged and swallowed
      if (result.tokensUsed) {
        this.conversationManager
          .incrementTokenUsage(context.clientId, result.tokensUsed)
          .catch((err) =>
            logger.warn({ err, clientId: context.clientId }, "Failed to update token usage")
          );
      }

      await adapter.sendMessage(msg.channelUserId, result.response);

      const totalLatency = Date.now() - startTime;
      logger.info(
        {
          conversationId,
          channel: msg.channelType,
          totalLatencyMs: totalLatency,
          tokensUsed: result.tokensUsed,
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

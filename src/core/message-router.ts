import type { NormalizedMessage, ChannelAdapter } from "../types/index.js";
import { ConversationManager } from "./conversation-manager.js";
import { AIBrain } from "./ai-brain.js";
import { config } from "../config/env.js";
import { logger } from "./logger.js";

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
   * 1. Dedup check
   * 2. Resolve user
   * 3. Resolve conversation
   * 4. Load context
   * 5. Generate AI response
   * 6. Save exchange
   * 7. Send response via channel adapter
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

      // 4. Load context
      const context = await this.conversationManager.loadContext(
        conversationId,
        config.DEFAULT_CLIENT_ID
      );

      // 5. Generate AI response
      const result = await this.aiBrain.generateResponse(context);

      // 6. Save AI response
      await this.conversationManager.saveAIResponse(conversationId, result.response);

      // 7. Send response
      const adapter = this.adapters.get(msg.channelType);
      if (!adapter) {
        logger.error({ channel: msg.channelType }, "No adapter for channel");
        return;
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

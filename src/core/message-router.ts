import type { NormalizedMessage, ChannelAdapter } from "../types/index.js";
import { ConversationManager } from "./conversation-manager.js";
import { AIBrain } from "./ai-brain.js";
import { logger } from "./logger.js";

const DEFAULT_CLIENT_ID = "shadowspark-demo"; // Demo client for MVP

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
      // 1. Dedup
      if (msg.channelMessageId) {
        const isDup = await this.conversationManager.isDuplicate(msg.channelMessageId);
        if (isDup) {
          logger.warn({ messageId: msg.channelMessageId }, "Duplicate message, skipping");
          return;
        }
      }

      // 2. Resolve user
      const userId = await this.conversationManager.resolveUser(msg);

      // 3. Resolve conversation
      const conversationId = await this.conversationManager.resolveConversation(
        userId,
        msg.channelType,
        DEFAULT_CLIENT_ID
      );

      // 4. Load context
      const context = await this.conversationManager.loadContext(
        conversationId,
        DEFAULT_CLIENT_ID
      );

      // Append current message to context for AI
      context.messages.push({ role: "USER", content: msg.text });

      // 5. Generate AI response
      const result = await this.aiBrain.generateResponse(context);

      // 6. Save exchange
      await this.conversationManager.saveExchange(
        conversationId,
        msg.text,
        result.response,
        msg.channelMessageId
      );

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

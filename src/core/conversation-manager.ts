import type { ChannelType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/client.js";
import type { ConversationContext, NormalizedMessage } from "../types/index.js";
import { logger } from "./logger.js";
import {
  checkTokenCap,
  incrementTokenUsage as trackTokenUsage,
} from "./token-tracker.js";

const CONTEXT_WINDOW = 10; // Last N messages to include in AI context
const CONVERSATION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export class ConversationManager {
  /**
   * Find or create user from incoming message
   */
  async resolveUser(msg: NormalizedMessage): Promise<string> {
    const existing = await prisma.userChannel.findUnique({
      where: {
        channelType_channelUserId: {
          channelType: msg.channelType,
          channelUserId: msg.channelUserId,
        },
      },
      select: { userId: true },
    });

    if (existing) return existing.userId;

    // Create new user + channel link (handle race with concurrent messages)
    try {
      const user = await prisma.chatUser.create({
        data: {
          name: msg.userName,
          phone: msg.channelType === "WHATSAPP" ? msg.channelUserId : undefined,
          channels: {
            create: {
              channelType: msg.channelType,
              channelUserId: msg.channelUserId,
            },
          },
        },
      });

      logger.info(
        { userId: user.id, channel: msg.channelType },
        "New user created",
      );
      return user.id;
    } catch (error) {
      // Unique constraint violation — concurrent request already created this user
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const retry = await prisma.userChannel.findUnique({
          where: {
            channelType_channelUserId: {
              channelType: msg.channelType,
              channelUserId: msg.channelUserId,
            },
          },
          select: { userId: true },
        });
        if (retry) return retry.userId;
      }
      throw error;
    }
  }

  /**
   * Get or create active conversation for user on channel.
   * Creates a new conversation if the last one timed out.
   */
  async resolveConversation(
    userId: string,
    channel: ChannelType,
    clientId: string,
  ): Promise<string> {
    // Use interactive transaction to prevent concurrent creation
    return prisma.$transaction(async (tx) => {
      const recent = await tx.conversation.findFirst({
        where: {
          userId,
          channel,
          clientId,
          status: "ACTIVE",
          updatedAt: { gte: new Date(Date.now() - CONVERSATION_TIMEOUT_MS) },
        },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });

      if (recent) return recent.id;

      const convo = await tx.conversation.create({
        data: { userId, channel, clientId },
      });

      logger.info({ conversationId: convo.id }, "New conversation started");
      return convo.id;
    });
  }

  /**
   * Load conversation context for AI processing
   */
  async loadContext(
    conversationId: string,
    clientId: string,
  ): Promise<ConversationContext> {
    const [conversation, clientConfig, tokenStatus] = await Promise.all([
      prisma.conversation.findUniqueOrThrow({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: CONTEXT_WINDOW,
            select: { role: true, content: true },
          },
        },
      }),
      prisma.clientConfig.findUnique({
        where: { clientId },
      }),
      checkTokenCap(clientId),
    ]);

    const systemPrompt = clientConfig?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;

    return {
      conversationId,
      userId: conversation.userId,
      clientId,
      messages: conversation.messages.reverse(), // Chronological order
      summary: conversation.summary ?? undefined,
      systemPrompt,
      handoffMessage: clientConfig?.fallbackMessage ?? DEFAULT_HANDOFF_MESSAGE,
      conversationStatus: conversation.status,
      tokenUsageLimit: tokenStatus.cap ?? 100_000,
      monthlyTokenUsage: tokenStatus.currentUsage,
    };
  }

  /**
   * Save user message to DB. Returns false if channelMessageId is a duplicate
   * (unique constraint acts as a dedup lock — prevents race between concurrent webhook deliveries).
   */
  async saveUserMessage(
    conversationId: string,
    text: string,
    channelMessageId?: string,
  ): Promise<boolean> {
    try {
      await prisma.message.create({
        data: {
          conversationId,
          role: "USER",
          content: text,
          channelMessageId,
        },
      });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return false; // Duplicate channelMessageId
      }
      throw error;
    }
  }

  /**
   * Transition conversation to HANDOFF status.
   * Subsequent messages are held for a human agent — AI is not called.
   */
  async setHandoffStatus(conversationId: string): Promise<void> {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: "HANDOFF", updatedAt: new Date() },
    });
  }

  /**
   * Increment the monthly token counter for a client after each AI call.
   * Non-critical path — failures are caught by the caller and logged, not thrown.
   * Uses the token-tracker module which handles month resets automatically.
   */
  async incrementTokenUsage(clientId: string, tokens: number): Promise<void> {
    await trackTokenUsage(clientId, tokens);
  }

  /**
   * Save AI response and update conversation timestamp
   */
  async saveAIResponse(
    conversationId: string,
    response: string,
  ): Promise<void> {
    await prisma.$transaction([
      prisma.message.create({
        data: { conversationId, role: "ASSISTANT", content: response },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);
  }
}

const DEFAULT_HANDOFF_MESSAGE =
  "Your request has been escalated to a human agent. " +
  "Someone from our team will reach you shortly. " +
  "Please hold on and do not send further messages — your conversation has been saved.";

const DEFAULT_SYSTEM_PROMPT = `You are a helpful customer support assistant for a Nigerian business.

Guidelines:
- Be friendly, professional, and concise
- Respond in the same language the customer uses (English or Pidgin)
- If you don't know something, say so honestly and offer to connect them with a human agent
- Keep responses under 300 words
- Use naira (₦) for any price references
- Be culturally aware of Nigerian business context
- If asked about ordering/pricing, provide available information and guide next steps
- For complaints, acknowledge the issue, apologize, and offer a resolution path`;

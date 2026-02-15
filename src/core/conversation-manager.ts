import { prisma } from "../db/client.js";
import type { NormalizedMessage, ConversationContext } from "../types/index.js";
import { logger } from "./logger.js";
import type { ChannelType } from "@prisma/client";

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

    // Create new user + channel link
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

    logger.info({ userId: user.id, channel: msg.channelType }, "New user created");
    return user.id;
  }

  /**
   * Get or create active conversation for user on channel.
   * Creates a new conversation if the last one timed out.
   */
  async resolveConversation(
    userId: string,
    channel: ChannelType,
    clientId: string
  ): Promise<string> {
    const recent = await prisma.conversation.findFirst({
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

    const convo = await prisma.conversation.create({
      data: { userId, channel, clientId },
    });

    logger.info({ conversationId: convo.id }, "New conversation started");
    return convo.id;
  }

  /**
   * Load conversation context for AI processing
   */
  async loadContext(
    conversationId: string,
    clientId: string
  ): Promise<ConversationContext> {
    const [conversation, clientConfig] = await Promise.all([
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
    ]);

    const systemPrompt =
      clientConfig?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;

    return {
      conversationId,
      userId: conversation.userId,
      clientId,
      messages: conversation.messages.reverse(), // Chronological order
      summary: conversation.summary ?? undefined,
      systemPrompt,
    };
  }

  /**
   * Save user message + AI response to database
   */
  async saveExchange(
    conversationId: string,
    userMessage: string,
    aiResponse: string,
    channelMessageId?: string
  ): Promise<void> {
    await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId,
          role: "USER",
          content: userMessage,
          channelMessageId,
        },
      }),
      prisma.message.create({
        data: {
          conversationId,
          role: "ASSISTANT",
          content: aiResponse,
        },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);
  }

  /**
   * Check for duplicate webhook delivery
   */
  async isDuplicate(channelMessageId: string): Promise<boolean> {
    const existing = await prisma.message.findUnique({
      where: { channelMessageId },
      select: { id: true },
    });
    return existing !== null;
  }
}

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

import type { ChannelType, MessageRole } from "@prisma/client";

export interface NormalizedMessage {
  channelType: ChannelType;
  channelUserId: string; // phone number, telegram chatId, etc.
  channelMessageId: string; // platform-specific message ID
  text: string;
  userName?: string;
  mediaUrl?: string;
  mediaType?: "image" | "audio" | "video" | "document";
  timestamp: Date;
  rawPayload: unknown;
}

export interface OutboundMessage {
  channelType: ChannelType;
  channelUserId: string;
  text: string;
  mediaUrl?: string;
}

export interface ConversationContext {
  conversationId: string;
  userId: string;
  clientId: string;
  messages: Array<{
    role: MessageRole;
    content: string;
  }>;
  summary?: string;
  systemPrompt: string;
}

export interface ChannelAdapter {
  readonly channelType: ChannelType;
  sendMessage(to: string, text: string): Promise<void>;
  verifyWebhook?(request: unknown): boolean;
}

export interface ProcessingResult {
  response: string;
  conversationId: string;
  tokensUsed?: number;
}

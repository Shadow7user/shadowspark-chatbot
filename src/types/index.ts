import type { ChannelType, MessageRole, ConversationStatus } from "@prisma/client";

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
  /** Message sent when conversation is escalated to a human agent */
  handoffMessage: string;
  /** Current status of the conversation — checked before deciding to call AI */
  conversationStatus: ConversationStatus;
  /** Monthly token cap for this client (from ClientConfig.tokenUsageLimit) */
  tokenUsageLimit: number;
  /** Tokens consumed so far this month (from ClientConfig.monthlyTokenUsage) */
  monthlyTokenUsage: number;
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

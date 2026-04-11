import { sendTextMessage } from "../lib/whatsapp.js";
import type { ChannelAdapter, NormalizedMessage } from "../types/index.js";
import { logger } from "../core/logger.js";
const MAX_MESSAGE_LENGTH = 1600;

export class TwilioWhatsAppAdapter implements ChannelAdapter {
  readonly channelType = "WHATSAPP" as const;

  async sendMessage(to: string, text: string): Promise<void> {
    try {
      await sendTextMessage(to, text);
      logger.info({ to }, "WhatsApp message sent via Cloud API");
    } catch (error) {
      logger.error({ to, error }, "WhatsApp Cloud API send failed");
      throw error;
    }
  }

  parseTwilioWebhook(body: MetaWebhookBody): NormalizedMessage | null {
    try {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const incoming = value?.messages?.[0];

      if (!incoming?.text?.body || !incoming.from || !incoming.id) return null;
      const profileName = value?.contacts?.[0]?.profile?.name;

      return {
        channelType: "WHATSAPP",
        channelUserId: incoming.from,
        channelMessageId: incoming.id,
        text: incoming.text.body.slice(0, MAX_MESSAGE_LENGTH),
        userName: profileName || undefined,
        timestamp: new Date(),
        rawPayload: body,
      };
    } catch (error) {
      logger.error({ error }, "Failed to parse Meta webhook");
      return null;
    }
  }
}

export interface MetaWebhookBody {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        messaging_product?: string;
        metadata?: {
          display_phone_number?: string;
          phone_number_id?: string;
        };
        contacts?: Array<{
          profile?: { name?: string };
          wa_id?: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
        }>;
      };
    }>;
  }>;
}

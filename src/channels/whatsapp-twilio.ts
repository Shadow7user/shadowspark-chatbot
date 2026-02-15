import twilio from "twilio";
import { config } from "../config/env.js";
import type { ChannelAdapter, NormalizedMessage } from "../types/index.js";
import { logger } from "../core/logger.js";

const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

export class TwilioWhatsAppAdapter implements ChannelAdapter {
  readonly channelType = "WHATSAPP" as const;

  async sendMessage(to: string, text: string): Promise<void> {
    const toNumber = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

    const webhookBase = config.WEBHOOK_BASE_URL || `http://localhost:${config.PORT}`;
    const message = await client.messages.create({
      from: config.TWILIO_WHATSAPP_NUMBER,
      to: toNumber,
      body: text,
      statusCallback: `${webhookBase}/health`,
    });

    logger.info({ to, sid: message.sid }, "WhatsApp message sent via Twilio");
  }

  parseTwilioWebhook(body: TwilioWebhookBody): NormalizedMessage | null {
    try {
      if (!body.Body || !body.From) return null;

      // Strip "whatsapp:" prefix for storage
      const from = body.From.replace("whatsapp:", "");

      return {
        channelType: "WHATSAPP",
        channelUserId: from,
        channelMessageId: body.MessageSid,
        text: body.Body,
        userName: body.ProfileName || undefined,
        timestamp: new Date(),
        rawPayload: body,
      };
    } catch (error) {
      logger.error({ error }, "Failed to parse Twilio webhook");
      return null;
    }
  }
}

export interface TwilioWebhookBody {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
  ProfileName?: string;
  WaId?: string;
}

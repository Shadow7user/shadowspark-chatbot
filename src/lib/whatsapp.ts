import { logger } from "../core/logger.js";

const WHATSAPP_API_BASE = "https://graph.facebook.com/v17.0";

function getWhatsAppToken(): string {
  const token = process.env.WHATSAPP_TOKEN ?? process.env.WHATSAPP_ACCESS_TOKEN;

  if (!token) {
    throw new Error(
      "Missing WHATSAPP_TOKEN (or legacy WHATSAPP_ACCESS_TOKEN) environment variable",
    );
  }

  return token;
}

function getPhoneNumberId(): string {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!phoneNumberId) {
    throw new Error("Missing WHATSAPP_PHONE_NUMBER_ID environment variable");
  }

  return phoneNumberId;
}

function normalizePhoneNumber(to: string): string {
  return to.replace(/[^\d]/g, "");
}

export async function sendTextMessage(to: string, body: string): Promise<void> {
  const phoneNumberId = getPhoneNumberId();
  const token = getWhatsAppToken();
  const normalizedTo = normalizePhoneNumber(to);

  const response = await fetch(
    `${WHATSAPP_API_BASE}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizedTo,
        type: "text",
        text: { body },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();

    logger.error(
      { to: normalizedTo, status: response.status, errorText },
      "WhatsApp Cloud API send failed",
    );

    throw new Error(
      `WhatsApp Cloud API send failed (${response.status}): ${errorText}`,
    );
  }
}

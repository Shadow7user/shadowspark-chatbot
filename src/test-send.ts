/**
 * Send a test message via WhatsApp Cloud API
 * Run: npx tsx src/test-send.ts +234XXXXXXXXXX "Hello from ShadowSpark!"
 */
import "dotenv/config";

const WHATSAPP_API = "https://graph.facebook.com/v21.0";

async function sendTestMessage() {
  const [, , to, ...messageParts] = process.argv;
  const message = messageParts.join(" ") || "Hello from ShadowSpark AI! 🤖";

  if (!to) {
    console.log("Usage: npx tsx src/test-send.ts +234XXXXXXXXXX \"Your message\"");
    process.exit(1);
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  console.log(`📤 Sending to ${to}: "${message}"`);

  const res = await fetch(`${WHATSAPP_API}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to.replace("+", ""),
      type: "text",
      text: { body: message },
    }),
  });

  const data = await res.json();

  if (res.ok) {
    console.log("✅ Message sent successfully");
    console.log("   Message ID:", (data as Record<string, Array<Record<string, string>>>).messages?.[0]?.id);
  } else {
    console.error("❌ Send failed:", JSON.stringify(data, null, 2));
  }
}

sendTestMessage();

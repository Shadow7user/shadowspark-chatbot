/**
 * Test script — verifies WhatsApp Cloud API connection
 * Run: npx tsx src/test-connection.ts
 */
import "dotenv/config";

const WHATSAPP_API = "https://graph.facebook.com/v21.0";

async function testWhatsAppConnection() {
  console.log("🔍 Testing WhatsApp Cloud API connection...\n");

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.error("❌ Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN in .env");
    process.exit(1);
  }

  // Test 1: Verify phone number ID is valid
  try {
    const res = await fetch(`${WHATSAPP_API}/${phoneNumberId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();

    if (res.ok) {
      console.log("✅ WhatsApp API connected");
      console.log(`   Phone: ${(data as Record<string, string>).display_phone_number}`);
      console.log(`   Name: ${(data as Record<string, string>).verified_name}`);
    } else {
      console.error("❌ WhatsApp API error:", JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("❌ Connection failed:", error);
  }
}

async function testOpenAI() {
  console.log("\n🔍 Testing OpenAI connection...\n");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("❌ Missing OPENAI_API_KEY in .env");
    return;
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Reply with exactly: CONNECTION_OK" },
          { role: "user", content: "test" },
        ],
        max_tokens: 10,
      }),
    });
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message: string };
    };

    if (res.ok && data.choices?.[0]?.message?.content) {
      console.log("✅ OpenAI connected — GPT-4o-mini responding");
    } else {
      console.error("❌ OpenAI error:", data.error?.message ?? JSON.stringify(data));
    }
  } catch (error) {
    console.error("❌ OpenAI connection failed:", error);
  }
}

async function testRedis() {
  console.log("\n🔍 Testing Redis connection...\n");

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error("❌ Missing REDIS_URL in .env");
    return;
  }

  try {
    const ioredis = await import("ioredis");
    const IORedis = ioredis.default ?? ioredis;
    const redis = new (IORedis as any)(redisUrl);
    await redis.set("shadowspark:test", "ok");
    const val = await redis.get("shadowspark:test");
    await redis.del("shadowspark:test");
    await redis.quit();

    if (val === "ok") {
      console.log("✅ Redis connected — read/write working");
    } else {
      console.error("❌ Redis read/write failed");
    }
  } catch (error) {
    console.error("❌ Redis connection failed:", error);
  }
}

async function testDatabase() {
  console.log("\n🔍 Testing PostgreSQL connection...\n");

  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log("✅ PostgreSQL connected via Prisma");
    await prisma.$disconnect();
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    console.log("   → Run: npx prisma generate && npx prisma db push");
  }
}

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  ShadowSpark Chatbot — Connection Tests  ");
  console.log("═══════════════════════════════════════════\n");

  await testWhatsAppConnection();
  await testOpenAI();
  await testRedis();
  await testDatabase();

  console.log("\n═══════════════════════════════════════════");
  console.log("  Tests complete. Fix any ❌ before running.");
  console.log("═══════════════════════════════════════════\n");

  process.exit(0);
}

main();

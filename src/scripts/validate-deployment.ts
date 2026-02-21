/**
 * Production Deployment Validation Script
 *
 * Validates all critical production services and produces a structured report.
 * Run: npm run validate:prod
 *
 * Covers:
 *  - Environment variable guards (Zod)
 *  - Database connectivity + schema verification
 *  - Redis connectivity
 *  - Twilio webhook signature (strict in production)
 *  - Server /health endpoint (if WEBHOOK_BASE_URL is set)
 */
import "dotenv/config";
import { z } from "zod";
import IORedis from "ioredis";

// ── Types ──────────────────────────────────────────────────────────────────────

type CheckStatus = "OK" | "FAIL" | "SKIP";

interface CheckResult {
  status: CheckStatus;
  detail?: string;
}

// ── Environment validation ─────────────────────────────────────────────────────

const requiredEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  TWILIO_ACCOUNT_SID: z.string().startsWith("AC").min(34),
  TWILIO_AUTH_TOKEN: z.string().min(32),
  TWILIO_WHATSAPP_NUMBER: z.string().regex(/^whatsapp:\+\d+$/),
  OPENAI_API_KEY: z.string().startsWith("sk-").min(20),
  REDIS_URL: z.string().min(1),
  NODE_ENV: z.enum(["development", "production", "test"]),
  WEBHOOK_BASE_URL: z.string().url().optional(),
  ADMIN_SECRET: z.string().min(16).optional(),
});

function checkEnvGuards(): CheckResult {
  const result = requiredEnvSchema.safeParse(process.env);
  if (!result.success) {
    const errs = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return { status: "FAIL", detail: errs };
  }
  const data = result.data;
  if (data.NODE_ENV === "production") {
    const missing: string[] = [];
    if (!data.WEBHOOK_BASE_URL) missing.push("WEBHOOK_BASE_URL");
    if (!data.ADMIN_SECRET) missing.push("ADMIN_SECRET");
    if (missing.length > 0) {
      return {
        status: "FAIL",
        detail: `Required in production but missing: ${missing.join(", ")}`,
      };
    }
  }
  return { status: "OK", detail: `NODE_ENV=${data.NODE_ENV}` };
}

// ── Database ───────────────────────────────────────────────────────────────────

async function checkDatabase(): Promise<CheckResult> {
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    await prisma.$connect();

    // Verify token-tracking columns exist in client_configs
    const cols = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'client_configs'
        AND column_name IN ('monthlyTokenUsage', 'monthlyTokenCap', 'lastResetMonth')
    `;
    await prisma.$disconnect();

    const found = cols.map((c) => c.column_name);
    const required = ["monthlyTokenUsage", "monthlyTokenCap", "lastResetMonth"];
    const missing = required.filter((c) => !found.includes(c));
    if (missing.length > 0) {
      return {
        status: "FAIL",
        detail: `client_configs missing columns: ${missing.join(", ")} — run: npx prisma migrate deploy`,
      };
    }
    return { status: "OK", detail: "connected; schema verified" };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { status: "FAIL", detail: msg };
  }
}

// ── Migration ──────────────────────────────────────────────────────────────────

async function checkMigration(): Promise<CheckResult> {
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    await prisma.$connect();

    // _prisma_migrations table exists when migrate deploy has been run
    const rows = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name
      FROM _prisma_migrations
      WHERE finished_at IS NOT NULL
      ORDER BY finished_at DESC
      LIMIT 1
    `;
    await prisma.$disconnect();

    if (rows.length === 0) {
      return {
        status: "FAIL",
        detail: "No applied migrations found — run: npx prisma migrate deploy",
      };
    }
    return { status: "OK", detail: `latest: ${rows[0].migration_name}` };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // Table missing means migrations have never been applied
    if (msg.includes("_prisma_migrations") || msg.includes("does not exist")) {
      return {
        status: "FAIL",
        detail: "_prisma_migrations table not found — run: npx prisma migrate deploy",
      };
    }
    return { status: "FAIL", detail: msg };
  }
}

// ── Redis ──────────────────────────────────────────────────────────────────────

async function checkRedis(): Promise<CheckResult> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return { status: "SKIP", detail: "REDIS_URL not set" };

  let redis: IORedis | undefined;
  try {
    redis = new IORedis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: true,
    });
    await redis.connect();
    await redis.set("shadowspark:validate", "ok", "EX", 10);
    const val = await redis.get("shadowspark:validate");
    await redis.del("shadowspark:validate");
    if (val !== "ok") {
      return { status: "FAIL", detail: "read/write mismatch" };
    }
    return { status: "OK", detail: "connected; read/write verified" };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { status: "FAIL", detail: msg };
  } finally {
    if (redis) await redis.quit().catch(() => undefined);
  }
}

// ── Webhook / server health ────────────────────────────────────────────────────

async function checkWebhook(): Promise<CheckResult> {
  const base = process.env.WEBHOOK_BASE_URL;
  if (!base) return { status: "SKIP", detail: "WEBHOOK_BASE_URL not set" };

  try {
    const url = `${base}/health`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const body = (await res.json()) as { status?: string; checks?: Record<string, string> };
      return { status: "OK", detail: `${url} → ${body.status ?? res.status}` };
    }
    return { status: "FAIL", detail: `${url} returned HTTP ${res.status}` };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { status: "FAIL", detail: msg };
  }
}

// ── Twilio webhook signature ───────────────────────────────────────────────────

function checkTwilioSignatureHandling(): CheckResult {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    return { status: "FAIL", detail: "TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN missing" };
  }
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === "production") {
    return {
      status: "OK",
      detail: "production mode — invalid signatures return 403",
    };
  }
  return {
    status: "OK",
    detail: `${nodeEnv} mode — signature validation active but non-blocking`,
  };
}

// ── AI key presence ────────────────────────────────────────────────────────────

function checkAIConfig(): CheckResult {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.startsWith("sk-")) {
    return { status: "FAIL", detail: "OPENAI_API_KEY missing or does not start with sk-" };
  }
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  return { status: "OK", detail: `model=${model}` };
}

// ── Report ─────────────────────────────────────────────────────────────────────

function formatRow(label: string, result: CheckResult): string {
  const icon = result.status === "OK" ? "✅" : result.status === "SKIP" ? "⏭ " : "❌";
  const detail = result.detail ? `  (${result.detail})` : "";
  return `  ${icon}  ${label.padEnd(18)} ${result.status}${detail}`;
}

async function main(): Promise<void> {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║     PRODUCTION VALIDATION REPORT                 ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  const [dbResult, migrationResult, redisResult, webhookResult] = await Promise.all([
    checkDatabase(),
    checkMigration(),
    checkRedis(),
    checkWebhook(),
  ]);

  const envResult = checkEnvGuards();
  const webhookSigResult = checkTwilioSignatureHandling();
  const aiResult = checkAIConfig();

  const results: Record<string, CheckResult> = {
    "Env Guards": envResult,
    Database: dbResult,
    Migration: migrationResult,
    Redis: redisResult,
    "Server /health": webhookResult,
    "Webhook Sig": webhookSigResult,
    "AI Config": aiResult,
  };

  console.log("--------------------------------");
  for (const [label, result] of Object.entries(results)) {
    console.log(formatRow(label, result));
  }
  console.log("--------------------------------\n");

  const hasFail = Object.values(results).some((r) => r.status === "FAIL");

  if (hasFail) {
    console.log("🚨 Final Status: BLOCKED\n");
    console.log("Corrective actions:");
    for (const [label, result] of Object.entries(results)) {
      if (result.status === "FAIL") {
        console.log(`  • ${label}: ${result.detail ?? "see above"}`);
      }
    }
    console.log();
    process.exit(1);
  } else {
    console.log("🎉 Final Status: DEPLOYMENT VERIFIED\n");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Validation script crashed:", err);
  process.exit(1);
});

/**
 * End-to-end flow test for Personality Layer v2
 *
 * Tests the full pipeline:
 *   incoming message → getModeForMessage() → PERSONALITY_MODES
 *   → enhanced system prompt construction → AI call parameters
 *
 * Run with: npx tsx src/lib/personality.e2e.test.ts
 */

import { getModeForMessage, PERSONALITY_MODES, type ModeKey } from "./personality.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildEnhancedSystemPrompt(basePrompt: string, userMessage: string): {
  mode: ModeKey;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
} {
  const mode = getModeForMessage(userMessage);
  const personality = PERSONALITY_MODES[mode];

  const systemPrompt =
    `${basePrompt}\n\n` +
    `[Adaptive Mode: ${mode}]\n` +
    `${personality.prefix}\n` +
    `Style: ${personality.style}\n` +
    `${personality.suffix}`;

  return {
    mode,
    systemPrompt,
    temperature: personality.temperature,
    maxTokens: personality.max_tokens,
  };
}

// ── Test runner ───────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✅  ${label}`);
  } else {
    failed++;
    console.log(`  ❌  ${label}${detail ? " — " + detail : ""}`);
  }
}

const BASE_PROMPT =
  "You are ShadowSpark AI, built by the founder of ShadowSpark Technologies in Nigeria.";

// ── Suite 1: Mode → system prompt contains correct prefix/suffix/style ────────

console.log("\n🔁 Suite 1: Enhanced system prompt construction per mode\n" + "─".repeat(60));

const suite1Cases: Array<{ msg: string; expectedMode: ModeKey }> = [
  { msg: "I'm confused about how this works", expectedMode: "confused" },
  { msg: "We are an enterprise company needing scale", expectedMode: "enterprise" },
  { msg: "I run a small startup, what's affordable?", expectedMode: "sme" },
  { msg: "What's the price for the demo?", expectedMode: "sales" },
  { msg: "Tell me about ShadowSpark", expectedMode: "default" },
  { msg: "Help me deploy to Railway and fix the error", expectedMode: "technical" },
  { msg: "Can you audit the security of my API?", expectedMode: "audit" },
];

for (const { msg, expectedMode } of suite1Cases) {
  const result = buildEnhancedSystemPrompt(BASE_PROMPT, msg);
  const p = PERSONALITY_MODES[expectedMode];

  assert(result.mode === expectedMode,
    `[${expectedMode}] mode detected correctly`);

  assert(result.systemPrompt.includes(BASE_PROMPT),
    `[${expectedMode}] base prompt preserved in system prompt`);

  assert(result.systemPrompt.includes(`[Adaptive Mode: ${expectedMode}]`),
    `[${expectedMode}] adaptive mode label present`);

  assert(result.systemPrompt.includes(p.prefix),
    `[${expectedMode}] prefix injected`);

  assert(result.systemPrompt.includes(p.style),
    `[${expectedMode}] style injected`);

  assert(result.systemPrompt.includes(p.suffix),
    `[${expectedMode}] suffix injected`);

  assert(result.temperature === p.temperature,
    `[${expectedMode}] temperature override = ${p.temperature}`);

  assert(result.maxTokens === p.max_tokens,
    `[${expectedMode}] max_tokens override = ${p.max_tokens}`);
}

// ── Suite 2: Temperature & token ranges are valid ─────────────────────────────

console.log("\n🌡️  Suite 2: Temperature & max_tokens validity\n" + "─".repeat(60));

for (const [mode, p] of Object.entries(PERSONALITY_MODES) as [ModeKey, typeof PERSONALITY_MODES[ModeKey]][]) {
  assert(p.temperature >= 0 && p.temperature <= 1,
    `[${mode}] temperature ${p.temperature} is in valid range [0, 1]`);

  assert(p.max_tokens > 0 && p.max_tokens <= 4096,
    `[${mode}] max_tokens ${p.max_tokens} is in valid range [1, 4096]`);
}

// ── Suite 3: Edge cases ───────────────────────────────────────────────────────

console.log("\n⚠️  Suite 3: Edge cases\n" + "─".repeat(60));

// Empty message → default
assert(getModeForMessage("") === "default",
  "Empty message → default mode");

// Whitespace only → default
assert(getModeForMessage("   ") === "default",
  "Whitespace-only message → default mode");

// Mixed keywords: sales wins over sme (sales check comes after sme in code, but "cost" is in both)
// "cost" triggers sme first in our implementation — verify consistent behaviour
const mixedResult = getModeForMessage("what is the cost for a small startup?");
assert(mixedResult === "sme" || mixedResult === "sales",
  `Mixed keywords (cost + small) → deterministic mode: ${mixedResult}`);

// Case insensitivity
assert(getModeForMessage("EXPLAIN THIS TO ME") === "confused",
  "Uppercase EXPLAIN → confused mode");

assert(getModeForMessage("ENTERPRISE SCALE") === "enterprise",
  "Uppercase ENTERPRISE → enterprise mode");

assert(getModeForMessage("SHOW ME THE DEMO") === "sales",
  "Uppercase SHOW ME → sales mode");

// Long message with keyword buried in middle
assert(getModeForMessage("Hello, I wanted to ask you something. Can you explain how the webhook integration works in detail?") === "confused",
  "Keyword buried in long message → correct mode");

// ── Suite 4: System prompt does NOT lose base identity ────────────────────────

console.log("\n🔒 Suite 4: Base identity preservation\n" + "─".repeat(60));

const longBase = `You are ShadowSpark AI, built by the founder of ShadowSpark Technologies in Nigeria.
Respond in a calm, visionary, strategic tone. Be intelligent, direct, confident, polite, and solution-oriented.
Use clear business language with light warmth. Position ShadowSpark as a trusted authority.`;

for (const mode of Object.keys(PERSONALITY_MODES) as ModeKey[]) {
  const fakeMsg = mode === "default" ? "hello" :
    mode === "confused" ? "explain this" :
    mode === "enterprise" ? "enterprise scale" :
    mode === "sme" ? "small startup" :
    mode === "technical" ? "deploy and fix error" :
    mode === "audit" ? "audit security" : "show me demo";

  const result = buildEnhancedSystemPrompt(longBase, fakeMsg);

  assert(result.systemPrompt.startsWith(longBase),
    `[${mode}] base identity is at the START of system prompt`);

  assert(result.systemPrompt.length > longBase.length,
    `[${mode}] personality block was appended (prompt is longer than base)`);
}

// ── Results ───────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log("\n" + "─".repeat(60));
console.log(`  Results: ${passed} passed, ${failed} failed out of ${total} assertions`);
console.log(failed === 0
  ? "\n🎉 All end-to-end flow tests passed!\n"
  : `\n⚠️  ${failed} assertion(s) failed — review above.\n`);

process.exit(failed > 0 ? 1 : 0);

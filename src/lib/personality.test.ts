/**
 * Quick inline test for getModeForMessage()
 * Run with: npx tsx src/lib/personality.test.ts
 */
import { getModeForMessage, PERSONALITY_MODES, type ModeKey } from "./personality.js";

interface TestCase {
  input: string;
  expected: ModeKey;
}

const cases: TestCase[] = [
  // confused branch
  { input: "I'm confused about how webhooks work", expected: "confused" },
  { input: "I don't understand this at all", expected: "confused" },
  { input: "Can you explain how this works?", expected: "confused" },
  { input: "How does the API connect?", expected: "confused" },

  // enterprise branch
  { input: "We are an enterprise company looking to scale", expected: "enterprise" },
  { input: "We need a production-grade solution", expected: "enterprise" },
  { input: "Our company needs this at scale", expected: "enterprise" },

  // sme branch
  { input: "I run a small business, is this affordable?", expected: "sme" },
  { input: "We are a startup looking for solutions", expected: "sme" },

  // sales branch
  { input: "What's the price for this?", expected: "sales" },
  { input: "How much does it cost?", expected: "sales" },
  { input: "Can you show me a demo?", expected: "sales" },
  { input: "Show me how it works", expected: "sales" },

  // technical branch
  { input: "How do I deploy to Railway?", expected: "technical" },
  { input: "I need to set up the database migration", expected: "technical" },
  { input: "There's an error in the webhook handler", expected: "technical" },
  { input: "Help me fix the Redis connection", expected: "technical" },
  { input: "Help me set up the CI/CD pipeline", expected: "technical" },

  // audit branch
  { input: "Can you audit my infrastructure?", expected: "audit" },
  { input: "How do I improve the security of my API?", expected: "audit" },
  { input: "Check for security vulnerabilities", expected: "audit" },

  // default branch
  { input: "Tell me about ShadowSpark", expected: "default" },
  { input: "Hello, I need help", expected: "default" },
  { input: "What services do you offer?", expected: "default" },
];

let passed = 0;
let failed = 0;

console.log("\n🧪 getModeForMessage() — Test Suite\n" + "─".repeat(55));

for (const { input, expected } of cases) {
  const result = getModeForMessage(input);
  const ok = result === expected;
  if (ok) {
    passed++;
    console.log(`  ✅  [${expected.padEnd(10)}]  "${input}"`);
  } else {
    failed++;
    console.log(`  ❌  [${result.padEnd(10)}]  "${input}"  (expected: ${expected})`);
  }
}

console.log("\n" + "─".repeat(55));
console.log(`  Results: ${passed} passed, ${failed} failed out of ${cases.length} cases`);

// Verify all PERSONALITY_MODES have required fields
console.log("\n🔍 PERSONALITY_MODES — Structure Check\n" + "─".repeat(55));
const modes = Object.keys(PERSONALITY_MODES) as ModeKey[];
for (const mode of modes) {
  const p = PERSONALITY_MODES[mode];
  const hasAll =
    typeof p.prefix === "string" &&
    typeof p.suffix === "string" &&
    typeof p.style === "string" &&
    typeof p.temperature === "number" &&
    typeof p.max_tokens === "number";
  console.log(`  ${hasAll ? "✅" : "❌"}  ${mode.padEnd(12)} temp=${p.temperature}  max_tokens=${p.max_tokens}`);
}

console.log("\n" + (failed === 0 ? "🎉 All tests passed!" : `⚠️  ${failed} test(s) failed — review above.`) + "\n");
process.exit(failed > 0 ? 1 : 0);

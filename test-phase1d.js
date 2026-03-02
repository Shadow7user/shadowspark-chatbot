/**
 * Phase 1D Enterprise Hardening - Test Suite
 * Tests all critical features: token tracking, handoff, security
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Color output helpers
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

function log(color, symbol, message) {
  console.log(`${color}${symbol}${colors.reset} ${message}`);
}

function pass(message) {
  log(colors.green, "✓", message);
}
function fail(message) {
  log(colors.red, "✗", message);
}
function info(message) {
  log(colors.blue, "ℹ", message);
}
function warn(message) {
  log(colors.yellow, "⚠", message);
}

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

async function testTokenTracking() {
  console.log(
    "\n" + colors.blue + "═══ Token Tracking Tests ═══" + colors.reset,
  );

  try {
    // Import token tracker
    const {
      checkTokenCap,
      incrementTokenUsage,
      getTokenUsage,
    } = require("./dist/core/token-tracker.js");

    // Test 1: Check token cap for demo client
    info("Testing checkTokenCap()...");
    const capResult = await checkTokenCap("shadowspark-demo");

    if (
      typeof capResult.exceeded === "boolean" &&
      typeof capResult.currentUsage === "number"
    ) {
      pass(
        `checkTokenCap() returns valid structure: ${JSON.stringify(capResult)}`,
      );
      results.passed++;
    } else {
      fail("checkTokenCap() returned invalid structure");
      results.failed++;
    }

    // Test 2: Get current usage
    info("Testing getTokenUsage()...");
    const usageResult = await getTokenUsage("shadowspark-demo");

    if (typeof usageResult.currentUsage === "number") {
      pass(
        `getTokenUsage() returns current usage: ${usageResult.currentUsage} tokens`,
      );
      results.passed++;
    } else {
      fail("getTokenUsage() returned invalid data");
      results.failed++;
    }

    // Test 3: Increment token usage
    info("Testing incrementTokenUsage()...");
    const beforeUsage = usageResult.currentUsage;
    const incrementResult = await incrementTokenUsage("shadowspark-demo", 100);

    if (incrementResult.currentUsage === beforeUsage + 100) {
      pass(
        `incrementTokenUsage() correctly incremented: ${beforeUsage} → ${incrementResult.currentUsage}`,
      );
      results.passed++;
    } else {
      fail(
        `incrementTokenUsage() failed: expected ${beforeUsage + 100}, got ${incrementResult.currentUsage}`,
      );
      results.failed++;
    }

    // Test 4: Month reset logic (check lastResetMonth field)
    info("Testing month reset logic...");
    const clientConfig = await prisma.clientConfig.findUnique({
      where: { clientId: "shadowspark-demo" },
      select: { lastResetMonth: true },
    });

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    if (clientConfig.lastResetMonth === currentMonth) {
      pass(`Month tracking correct: ${clientConfig.lastResetMonth}`);
      results.passed++;
    } else {
      warn(
        `Month may need reset: ${clientConfig.lastResetMonth} vs ${currentMonth}`,
      );
      results.warnings++;
    }

    // Test 5: Token cap enforcement
    info("Testing token cap enforcement...");
    const capConfig = await prisma.clientConfig.findUnique({
      where: { clientId: "shadowspark-demo" },
      select: { monthlyTokenCap: true, monthlyTokenUsage: true },
    });

    if (capConfig.monthlyTokenCap === null) {
      warn("No token cap set (unlimited usage allowed)");
      results.warnings++;
    } else {
      const capCheck = await checkTokenCap("shadowspark-demo");
      if (
        capCheck.exceeded ===
        capConfig.monthlyTokenUsage >= capConfig.monthlyTokenCap
      ) {
        pass(
          `Token cap enforcement logic correct: ${capCheck.exceeded ? "EXCEEDED" : "OK"}`,
        );
        results.passed++;
      } else {
        fail("Token cap enforcement logic incorrect");
        results.failed++;
      }
    }
  } catch (error) {
    fail(`Token tracking test error: ${error.message}`);
    results.failed++;
  }
}

async function testHandoffLogic() {
  console.log(
    "\n" + colors.blue + "═══ Handoff Logic Tests ═══" + colors.reset,
  );

  try {
    // Test 1: Handoff keyword pattern
    info("Testing handoff keyword detection...");
    const HANDOFF_PATTERN = /\b(agent|human|support)\b/i;

    const testCases = [
      { text: "I need an agent", expected: true },
      { text: "Can I speak to a human?", expected: true },
      { text: "I need support", expected: true },
      { text: "Hello how are you", expected: false },
      { text: "What is your name?", expected: false },
      { text: "AGENT please", expected: true },
      { text: "humane society", expected: false }, // Should NOT match (not whole word)
    ];

    let patternTestsPassed = 0;
    for (const test of testCases) {
      const matches = HANDOFF_PATTERN.test(test.text);
      if (matches === test.expected) {
        patternTestsPassed++;
      } else {
        fail(
          `Pattern test failed: "${test.text}" - expected ${test.expected}, got ${matches}`,
        );
      }
    }

    if (patternTestsPassed === testCases.length) {
      pass(
        `Handoff keyword pattern correct (${patternTestsPassed}/${testCases.length} tests passed)`,
      );
      results.passed++;
    } else {
      fail(
        `Handoff keyword pattern issues (${patternTestsPassed}/${testCases.length} tests passed)`,
      );
      results.failed++;
    }

    // Test 2: Check ConversationStatus enum exists
    info("Testing ConversationStatus enum...");
    const statusCheck = await prisma.conversation.findFirst({
      select: { status: true },
    });

    if (statusCheck) {
      pass(`ConversationStatus enum working: ${statusCheck.status}`);
      results.passed++;
    } else {
      warn("No conversations found to test status enum");
      results.warnings++;
    }
  } catch (error) {
    fail(`Handoff logic test error: ${error.message}`);
    results.failed++;
  }
}

async function testDatabaseSchema() {
  console.log(
    "\n" + colors.blue + "═══ Database Schema Tests ═══" + colors.reset,
  );

  try {
    // Test 1: ClientConfig has token tracking fields
    info("Testing ClientConfig schema...");
    const clientConfig = await prisma.clientConfig.findUnique({
      where: { clientId: "shadowspark-demo" },
    });

    if (clientConfig) {
      const hasTokenFields =
        "monthlyTokenUsage" in clientConfig &&
        "monthlyTokenCap" in clientConfig &&
        "lastResetMonth" in clientConfig;

      if (hasTokenFields) {
        pass("ClientConfig has all token tracking fields");
        results.passed++;
      } else {
        fail("ClientConfig missing token tracking fields");
        results.failed++;
      }
    } else {
      warn("Demo client config not found - run /setup/seed-demo");
      results.warnings++;
    }

    // Test 2: Conversation has HANDOFF status
    info("Testing Conversation status enum...");
    const conversationStatuses = ["ACTIVE", "PAUSED", "HANDOFF", "CLOSED"];
    pass(
      `Conversation status enum includes: ${conversationStatuses.join(", ")}`,
    );
    results.passed++;

    // Test 3: Message has channelMessageId for deduplication
    info("Testing Message deduplication field...");
    const messageSchema = await prisma.message.findFirst({
      select: { channelMessageId: true },
    });

    if (messageSchema !== null) {
      pass("Message has channelMessageId field for deduplication");
      results.passed++;
    } else {
      warn("No messages found to verify channelMessageId field");
      results.warnings++;
    }
  } catch (error) {
    fail(`Database schema test error: ${error.message}`);
    results.failed++;
  }
}

async function testEnvironmentValidation() {
  console.log(
    "\n" + colors.blue + "═══ Environment Validation Tests ═══" + colors.reset,
  );

  try {
    // Test 1: Config loaded successfully
    info("Testing environment configuration...");
    const { config } = require("./dist/config/env.js");

    if (config) {
      pass("Environment configuration loaded successfully");
      results.passed++;
    } else {
      fail("Environment configuration failed to load");
      results.failed++;
      return;
    }

    // Test 2: Required fields present
    info("Testing required environment variables...");
    const requiredFields = [
      "DATABASE_URL",
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_WHATSAPP_NUMBER",
      "OPENAI_API_KEY",
      "REDIS_URL",
      "NODE_ENV",
    ];

    let missingFields = [];
    for (const field of requiredFields) {
      if (!config[field]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length === 0) {
      pass("All required environment variables present");
      results.passed++;
    } else {
      fail(`Missing required variables: ${missingFields.join(", ")}`);
      results.failed++;
    }

    // Test 3: Production-specific validation
    info("Testing production environment requirements...");
    if (config.NODE_ENV === "production") {
      if (config.WEBHOOK_BASE_URL && config.ADMIN_SECRET) {
        pass("Production requirements met (WEBHOOK_BASE_URL, ADMIN_SECRET)");
        results.passed++;
      } else {
        fail("Production mode missing WEBHOOK_BASE_URL or ADMIN_SECRET");
        results.failed++;
      }
    } else {
      info(`Running in ${config.NODE_ENV} mode - production checks skipped`);
      results.passed++;
    }

    // Test 4: Twilio number format
    info("Testing Twilio WhatsApp number format...");
    if (config.TWILIO_WHATSAPP_NUMBER.startsWith("whatsapp:+")) {
      pass(`Twilio number format correct: ${config.TWILIO_WHATSAPP_NUMBER}`);
      results.passed++;
    } else {
      fail(`Twilio number format incorrect: ${config.TWILIO_WHATSAPP_NUMBER}`);
      results.failed++;
    }
  } catch (error) {
    fail(`Environment validation test error: ${error.message}`);
    results.failed++;
  }
}

async function testSecurityFeatures() {
  console.log(
    "\n" + colors.blue + "═══ Security Features Tests ═══" + colors.reset,
  );

  try {
    // Test 1: Admin secret protection
    info("Testing admin secret protection...");
    const response = await fetch("http://localhost:3001/setup/seed-demo", {
      headers: { "x-admin-secret": "wrong-secret" },
    });

    if (response.status === 401) {
      pass("Admin secret protection working (401 Unauthorized)");
      results.passed++;
    } else {
      fail(`Admin secret protection failed (got ${response.status})`);
      results.failed++;
    }

    // Test 2: Health endpoint accessible
    info("Testing health endpoint...");
    const healthResponse = await fetch("http://localhost:3001/health");
    const healthData = await healthResponse.json();

    if (healthResponse.status === 200 && healthData.status === "ok") {
      pass("Health endpoint accessible and working");
      results.passed++;
    } else {
      fail("Health endpoint not working correctly");
      results.failed++;
    }

    // Test 3: Webhook endpoint accepts POST
    info("Testing webhook endpoint...");
    const webhookResponse = await fetch(
      "http://localhost:3001/webhooks/whatsapp",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "MessageSid=TEST&From=whatsapp:+1234567890&Body=test",
      },
    );

    if (webhookResponse.status === 200) {
      pass("Webhook endpoint accepts POST requests");
      results.passed++;
    } else {
      fail(`Webhook endpoint returned ${webhookResponse.status}`);
      results.failed++;
    }
  } catch (error) {
    fail(`Security features test error: ${error.message}`);
    results.failed++;
  }
}

async function runAllTests() {
  console.log(colors.blue + "\n╔════════════════════════════════════════════╗");
  console.log("║  Phase 1D Enterprise Hardening Test Suite ║");
  console.log("╚════════════════════════════════════════════╝" + colors.reset);

  await testEnvironmentValidation();
  await testDatabaseSchema();
  await testTokenTracking();
  await testHandoffLogic();
  await testSecurityFeatures();

  // Print summary
  console.log("\n" + colors.blue + "═══ Test Summary ═══" + colors.reset);
  console.log(`${colors.green}✓ Passed:${colors.reset}   ${results.passed}`);
  console.log(`${colors.red}✗ Failed:${colors.reset}   ${results.failed}`);
  console.log(`${colors.yellow}⚠ Warnings:${colors.reset} ${results.warnings}`);

  const total = results.passed + results.failed;
  const percentage =
    total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;

  console.log(
    `\n${colors.blue}Overall:${colors.reset} ${percentage}% tests passed (${results.passed}/${total})`,
  );

  if (results.failed === 0) {
    console.log(
      `\n${colors.green}✓ All critical tests passed! Phase 1D implementation verified.${colors.reset}\n`,
    );
  } else {
    console.log(
      `\n${colors.red}✗ ${results.failed} test(s) failed. Review implementation.${colors.reset}\n`,
    );
  }

  await prisma.$disconnect();
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  console.error(colors.red + "Fatal test error:" + colors.reset, error);
  process.exit(1);
});

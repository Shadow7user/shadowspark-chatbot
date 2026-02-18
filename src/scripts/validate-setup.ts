/**
 * Setup Validation Script
 * 
 * Validates environment configuration and service connectivity
 * Run with: npx tsx src/scripts/validate-setup.ts
 */

import { config } from "../config/env.js"
import { PrismaClient } from "@prisma/client"
import { Redis } from "ioredis"
import twilio from "twilio"
import { OpenAI } from "openai"

interface ValidationResult {
  service: string
  status: "✅ PASS" | "❌ FAIL" | "⚠️ WARN"
  message: string
}

const results: ValidationResult[] = []

function addResult(service: string, status: ValidationResult["status"], message: string) {
  results.push({ service, status, message })
}

async function validateDatabase() {
  console.log("\n🔍 Validating Database (PostgreSQL)...")
  try {
    const prisma = new PrismaClient()
    await prisma.$queryRaw`SELECT 1`
    await prisma.$disconnect()
    addResult("Database", "✅ PASS", "Connected successfully to PostgreSQL")
  } catch (error) {
    addResult("Database", "❌ FAIL", `Connection failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function validateRedis() {
  console.log("\n🔍 Validating Redis...")
  try {
    const redis = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 2,
      retryStrategy: (times) => {
        if (times > 2) return null
        return 1000
      }
    })
    
    await redis.ping()
    await redis.quit()
    addResult("Redis", "✅ PASS", "Connected successfully to Redis")
  } catch (error) {
    addResult("Redis", "❌ FAIL", `Connection failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function validateTwilio() {
  console.log("\n🔍 Validating Twilio...")
  
  // Check format of credentials
  if (!config.TWILIO_ACCOUNT_SID.startsWith("AC")) {
    addResult("Twilio", "❌ FAIL", "TWILIO_ACCOUNT_SID must start with 'AC'")
    return
  }
  
  if (!config.TWILIO_WHATSAPP_NUMBER.startsWith("whatsapp:")) {
    addResult("Twilio", "⚠️ WARN", "TWILIO_WHATSAPP_NUMBER should start with 'whatsapp:' (e.g., 'whatsapp:+1234567890')")
  }
  
  try {
    const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN)
    const account = await client.api.accounts(config.TWILIO_ACCOUNT_SID).fetch()
    
    addResult("Twilio", "✅ PASS", `Connected successfully (Status: ${account.status})`)
  } catch (error) {
    addResult("Twilio", "❌ FAIL", `Authentication failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function validateOpenAI() {
  console.log("\n🔍 Validating OpenAI...")
  
  if (!config.OPENAI_API_KEY.startsWith("sk-")) {
    addResult("OpenAI", "❌ FAIL", "OPENAI_API_KEY must start with 'sk-'")
    return
  }
  
  try {
    const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY })
    const models = await openai.models.list()
    
    if (models.data.length > 0) {
      addResult("OpenAI", "✅ PASS", "API key is valid and active")
    } else {
      addResult("OpenAI", "⚠️ WARN", "API key valid but no models found")
    }
  } catch (error) {
    addResult("OpenAI", "❌ FAIL", `Authentication failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function validateEnvironment() {
  console.log("\n🔍 Validating Environment Configuration...")
  
  // Check NODE_ENV
  if (config.NODE_ENV !== "development" && config.NODE_ENV !== "production") {
    addResult("Environment", "⚠️ WARN", `NODE_ENV is '${config.NODE_ENV}' (should be 'development' or 'production')`)
  } else {
    addResult("Environment", "✅ PASS", `NODE_ENV is '${config.NODE_ENV}'`)
  }
  
  // Check production requirements
  if (config.NODE_ENV === "production") {
    if (!config.ADMIN_SECRET || config.ADMIN_SECRET.length < 16) {
      addResult("Admin Secret", "❌ FAIL", "ADMIN_SECRET is required in production (minimum 16 characters)")
    } else {
      addResult("Admin Secret", "✅ PASS", "ADMIN_SECRET is set and meets requirements")
    }
    
    if (!config.WEBHOOK_BASE_URL) {
      addResult("Webhook URL", "❌ FAIL", "WEBHOOK_BASE_URL is required in production")
    } else if (!config.WEBHOOK_BASE_URL.startsWith("https://")) {
      addResult("Webhook URL", "⚠️ WARN", "WEBHOOK_BASE_URL should use HTTPS in production")
    } else {
      addResult("Webhook URL", "✅ PASS", `WEBHOOK_BASE_URL is set: ${config.WEBHOOK_BASE_URL}`)
    }
  } else {
    // Development warnings
    if (!config.ADMIN_SECRET) {
      addResult("Admin Secret", "⚠️ WARN", "ADMIN_SECRET not set (optional for development, but recommended for testing)")
    } else {
      addResult("Admin Secret", "✅ PASS", "ADMIN_SECRET is set")
    }
    
    if (!config.WEBHOOK_BASE_URL) {
      addResult("Webhook URL", "⚠️ WARN", "WEBHOOK_BASE_URL not set (use ngrok for local webhook testing)")
    } else {
      addResult("Webhook URL", "✅ PASS", `WEBHOOK_BASE_URL is set: ${config.WEBHOOK_BASE_URL}`)
    }
  }
  
  // Check PORT
  if (config.PORT < 1 || config.PORT > 65535) {
    addResult("Port", "❌ FAIL", `PORT ${config.PORT} is invalid (must be 1-65535)`)
  } else {
    addResult("Port", "✅ PASS", `Server will run on port ${config.PORT}`)
  }
}

function printResults() {
  console.log("\n" + "=".repeat(80))
  console.log("📊 VALIDATION RESULTS")
  console.log("=".repeat(80))
  
  const passCount = results.filter(r => r.status === "✅ PASS").length
  const warnCount = results.filter(r => r.status === "⚠️ WARN").length
  const failCount = results.filter(r => r.status === "❌ FAIL").length
  
  for (const result of results) {
    console.log(`\n${result.status} ${result.service}`)
    console.log(`   ${result.message}`)
  }
  
  console.log("\n" + "=".repeat(80))
  console.log(`Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} failed`)
  console.log("=".repeat(80))
  
  if (failCount > 0) {
    console.log("\n❌ Setup validation FAILED. Please fix the errors above before proceeding.")
    console.log("   See SETUP_GUIDE.md for detailed setup instructions.")
    process.exit(1)
  } else if (warnCount > 0) {
    console.log("\n⚠️  Setup validation PASSED with warnings. Review warnings above.")
    console.log("   Your application should work, but some features may be limited.")
  } else {
    console.log("\n✅ Setup validation PASSED! Your configuration looks good.")
    console.log("   You can now start the application with: npm run dev")
  }
}

async function main() {
  console.log("🚀 ShadowSpark Chatbot - Setup Validation")
  console.log("=".repeat(80))
  
  // Environment validation (synchronous)
  validateEnvironment()
  
  // Service validations (asynchronous)
  await validateDatabase()
  await validateRedis()
  await validateTwilio()
  await validateOpenAI()
  
  // Print results
  printResults()
}

main().catch((error) => {
  console.error("\n❌ Fatal error during validation:", error)
  process.exit(1)
})

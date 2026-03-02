# ShadowSpark Chatbot - Enterprise Context Document

**Last Updated:** 2026-02-17  
**System Status:** Production-Ready (Hardened)  
**Deployment:** Railway + Neon PostgreSQL + Redis

---

## System Architecture

### High-Level Flow
Twilio WhatsApp → Fastify Webhook → BullMQ Queue → Worker → Prisma DB → OpenAI GPT-4o-mini → Response

### Core Components

1. Entry Point (src/server.ts)
   - Fastify HTTP server with Twilio signature validation
   - Webhook: POST /webhook/whatsapp
   - Admin: /setup/* (X-Admin-Secret protected)

2. Message Queue (src/queues/message-queue.ts)
   - BullMQ + Redis async processing
   - Prevents webhook timeouts

3. Message Router (src/core/message-router.ts)
   - Token limit checks before AI calls
   - Handoff triggers: agent, human, support

4. Token Tracker (src/core/token-tracker.ts)
   - Monthly usage tracking with auto-reset
   - Fail-open on errors

---

## Database Schema

### ClientConfig
- monthlyTokenUsage (Int, default: 0)
- monthlyTokenCap (Int?, optional)
- lastResetMonth (String?, YYYY-MM format)
- systemPrompt, maxTokens, temperature

### Conversation
- status: ACTIVE | PAUSED | HANDOFF | CLOSED
- channel: WHATSAPP | TELEGRAM | WEB

---

## Security Hardening

### 1. Environment Validation (src/config/env.ts)
- Zod schema for all env vars
- Production requires: ADMIN_SECRET (≥16 chars), WEBHOOK_BASE_URL
- Process exits on validation failure

### 2. Railway Guard (src/server.ts)
- Enforces NODE_ENV=production when RAILWAY_ENVIRONMENT set

### 3. Twilio Signature Validation
- Production-enforced, returns 403 on invalid signature

### 4. Admin Secret Protection
- X-Admin-Secret header required for /setup/* endpoints

---

## Token Tracking Logic

### Functions
1. checkTokenCap(clientId) - Returns {exceeded, currentUsage, cap, remaining}
2. incrementTokenUsage(clientId, tokens) - Auto-resets on month change
3. getTokenUsage(clientId) - Current stats

### Month Reset
- Detects new month via lastResetMonth field
- Resets monthlyTokenUsage to 0 automatically
- Updates lastResetMonth to current YYYY-MM

---

## Railway Deployment

### railway.toml
- buildCommand: npm run build
- startCommand: npm start
- restartPolicyType: ON_FAILURE (max 3 retries)

### Required Env Vars (Production)
- NODE_ENV=production
- DATABASE_URL (with pgbouncer=true)
- TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER
- OPENAI_API_KEY
- REDIS_URL
- WEBHOOK_BASE_URL
- ADMIN_SECRET (≥16 chars)

### Migration Command
npx prisma migrate deploy

---

## Hardening Checklist

### Completed
- [x] TypeScript strict mode, no any types
- [x] Zod validation for env vars
- [x] Railway environment guard
- [x] Twilio signature validation
- [x] Admin secret protection (min 16 chars)
- [x] Token tracking with auto-reset
- [x] Human handoff (trigger words)
- [x] All async wrapped in try/catch

### Pending
- [ ] Run migration on Railway
- [ ] Set ADMIN_SECRET in Railway (≥16 chars)
- [ ] Verify WEBHOOK_BASE_URL
- [ ] Test token cap in production

---

## Code Standards

### TypeScript
- Strict mode enabled
- No any types
- Target: ES2022

### Formatting
- 2 spaces, no semicolons
- Double quotes preferred

### Error Handling
Always wrap async in try/catch with structured logging

### Validation
Use Zod for all input validation

---

## Architectural Patterns

### 1. Singleton (Database Client)
getPrismaClient() returns single instance

### 2. Queue-Based Processing
Webhook → Enqueue → Return 200 → Worker processes async

### 3. Fail-Open Strategy
Token tracker errors logged but don't block requests

### 4. Context Loading
Last 10 messages loaded for conversation context

---

## Common Pitfalls

### 1. Database Connection Leaks
✅ Use getPrismaClient() singleton
❌ Don't create new PrismaClient() instances

### 2. Unvalidated Env Vars
✅ Import from config/env.ts (Zod validated)
❌ Don't use process.env directly

### 3. Missing Error Handling
✅ Wrap all async in try/catch
❌ Don't leave async calls unwrapped

### 4. Hardcoded Client IDs
✅ Use conversation.clientId || DEFAULT_CLIENT_ID
❌ Don't hardcode shadowspark-demo

---

## Key Files

### Config
- src/config/env.ts - Zod validation
- railway.toml - Deployment config

### Core
- src/server.ts - Fastify + webhooks
- src/core/message-router.ts - Orchestration
- src/core/token-tracker.ts - Usage tracking
- src/core/ai-brain.ts - OpenAI integration

### Database
- prisma/schema.prisma - Schema
- src/db/client.ts - Singleton

---

## System Behavior

### Normal Flow
User → Twilio → Webhook → Queue → Worker → Token Check → OpenAI → Response

### Token Limit Exceeded
Token check fails → Send limit message → No AI call

### Handoff Triggered
User types agent/human/support → Status = HANDOFF → No AI responses

### Month Reset
First message in new month → Reset monthlyTokenUsage to 0

---

**Never suggest insecure shortcuts. Always assume production environment.**

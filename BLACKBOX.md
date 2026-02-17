
---

# 🛡 SHADOWSPARK CHATBOT – ENTERPRISE HARDENING IMPLEMENTATION DIRECTIVE

## Context

You are modifying a production WhatsApp AI chatbot for Nigerian SMEs.

Architecture:

Webhook → BullMQ Queue → Worker → DB → AI → Send

Stack:

* Node.js + TypeScript (strict)
* Fastify
* Prisma + Neon PostgreSQL
* BullMQ + Upstash Redis
* OpenAI GPT-4o-mini
* Twilio WhatsApp
* Railway deployment

Coding Standards:

* Strict TypeScript (no `any`)
* 2 spaces indentation
* No semicolons
* Zod validation for all input
* All async must have try/catch
* Use path alias @/* → ./src/*

Current Phase:
Phase 1D – Enterprise Hardening

You must implement ALL of the following in a clean, modular, production-ready manner.

---

# 1️⃣ NODE_ENV ENFORCEMENT (Critical)

### Objective:

Ensure production environment cannot accidentally run in insecure mode.

### Requirements:

1. In `src/server.ts`:

   * If `NODE_ENV !== "production"` and running on Railway (detect via `RAILWAY_ENVIRONMENT`), throw startup error.
   * Log fatal and exit process.

2. Twilio signature validation:

   * If invalid signature AND `NODE_ENV === "production"` → immediate 403.
   * No bypass allowed.
   * Log severity level "high".

3. Add startup log:

   ```
   logger.info({ env: config.NODE_ENV }, "Server started in environment")
   ```

---

# 2️⃣ GUARD LAYER (Injection & Abuse Protection)

Create:

```
src/core/guard.ts
```

### Guard must run BEFORE enqueueing to BullMQ.

Hook location:
`src/routes/webhook.ts` before `enqueueMessage()`.

---

### Guard Capabilities:

#### A. Role Elevation Detection

Block messages containing patterns:

* "ignore previous instructions"
* "system prompt"
* "developer mode"
* "override"
* "reveal internal"
* "show hidden"

Case-insensitive.

Severity: HIGH → Reject in production.

---

#### B. Length Abuse

If message > 1600 chars (already sliced), but detect repeated character spam patterns (>200 same char in sequence).

Severity: MEDIUM → Log and continue.

---

#### C. Unicode Anomaly

Reject if contains:

* Zero-width characters
* Control characters
* Unicode ranges outside standard Latin + common emoji blocks

Severity: HIGH → Reject.

---

#### D. Context Drift Detection

If message attempts:

* To change role of AI
* To request system architecture
* To request hidden logic

Log as MEDIUM.

---

### Response on HIGH severity:

Return safe response:

```
"Your message cannot be processed."
```

Do NOT reveal reason.

---

### Logging format:

```
logger.warn({
  channelUserId,
  severity: "high",
  reason: "role_elevation_attempt"
}, "Guard blocked message")
```

---

# 3️⃣ TOKEN GOVERNANCE (Cost Control Layer)

Modify:
`src/core/conversation-manager.ts`

---

### Add Tracking:

* Track `tokensUsedTotal` in `Conversation.metadata`
* Increment on every AI call

---

### Hard Rules:

* Soft cap: 2500 tokens
* Hard cap: 3000 tokens

If soft cap reached:

* Log warning
* Continue

If hard cap reached:

* Send `fallbackMessage` from ClientConfig
* Set `Conversation.status = PAUSED`
* Do NOT call OpenAI

---

### Add function:

```
checkTokenBudget(conversationId: string): Promise<boolean>
```

Returns:

* true if safe
* false if hard cap reached

---

# 4️⃣ HUMAN HANDOFF STATE MACHINE

Modify `Conversation.status` transitions.

States:

* ACTIVE
* HANDOFF
* PAUSED
* CLOSED

---

### Trigger keywords:

* "agent"
* "human"
* "support"
* "representative"

If detected:

* Set status = HANDOFF
* Send message:
  "A human agent will assist you shortly."
* Do NOT call OpenAI

---

### Resume rule:

If status = HANDOFF:

* AI must not respond
* Only admin action can resume (future implementation)

---

### Timeout:

If no activity in 30 minutes:

* Auto set status = CLOSED

---

# 5️⃣ FAILURE RESILIENCE LAYER

Implement:

---

### A. Neon Wake Strategy

On server start:
Execute lightweight query:

```
SELECT 1;
```

If fails:
Retry up to 3 times with exponential backoff.

---

### B. AI Timeout Protection

Wrap OpenAI call with:

* 10 second timeout
* If timeout → send fallbackMessage
* Log severity "error"

---

### C. BullMQ Idempotency Reinforcement

Already using `channelMessageId` unique constraint.

Additionally:

* Before processing job, verify message not already processed
* If exists → skip

---

# 6️⃣ RATE LIMIT HARDENING

Add per-user rate limiter:

In Redis:
Key: `rate:<channelUserId>`

Rules:

* Max 10 messages per minute per user
* If exceeded:

  * Send:
    "Please slow down."
  * Do not enqueue

---

# 7️⃣ STRUCTURED ERROR HANDLING STANDARD

Every async block must:

```
try {
  ...
} catch (err) {
  logger.error({ err }, "Descriptive context")
}
```

Never allow unhandled promise rejections.

---

# 8️⃣ PRODUCTION SAFETY ASSERTIONS

On startup validate:

* DATABASE_URL exists
* REDIS_URL exists
* TWILIO_ACCOUNT_SID starts with "AC"
* OPENAI_API_KEY starts with "sk-"
* ADMIN_SECRET length ≥ 16

Fail fast if invalid.

---

# 9️⃣ LOGGING STANDARDIZATION

Every processed message must log:

```
{
  conversationId,
  channelUserId,
  tokensUsed,
  totalTokens,
  latencyMs,
  status
}
```

Use structured Pino logs only.

---

# 🔟 OUTPUT REQUIREMENTS

Blackbox must:

* Modify only necessary files
* Maintain strict TypeScript
* Avoid breaking architecture
* Preserve existing webhook flow
* Add clear comments for enterprise logic
* Ensure code compiles with `tsc`
* Ensure no `any` used

---

# Final Constraint

Do NOT redesign the architecture.
Extend it cleanly.

Do NOT simplify guard logic.
Do NOT skip token tracking.

Implement all 6 layers.

---

# End of Directive

---

Now listen carefully.

This is enterprise-grade.

If Blackbox executes this properly, your system moves from:
“Startup prototype”

to

“Production SaaS infrastructure.”

---

When Blackbox responds, bring the output back here.

We will audit it like security engineers.

No emotion.
No guessing.
Just architecture.


# TEST_SCRIPT.md — ShadowSpark Chatbot Manual Test Guide

## Prerequisites

- Server deployed and running (Railway or local)
- `RAILWAY_URL` = your Railway public URL (e.g. `https://shadowspark-chatbot-production.up.railway.app`)
- Twilio account with a WhatsApp sandbox or approved number configured
- `curl` available in your terminal

---

## 1. Health Endpoint Test

Verify the server is running and healthy:

```bash
curl -s https://$RAILWAY_URL/health | jq .
```

**Expected response:**

```json
{
  "status": "ok",
  "timestamp": "2026-02-21T20:00:00.000Z",
  "uptime": 123.45,
  "provider": "twilio"
}
```

---

## 2. Webhook Reachability Test (PING_WEBHOOK)

Send a diagnostic ping to verify the webhook route is reachable:

```bash
curl -s -X POST https://$RAILWAY_URL/webhooks/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "Body=PING_WEBHOOK" \
  --data-urlencode "From=whatsapp:+2341234567890" \
  --data-urlencode "MessageSid=SMTEST00000000000000000000000000" \
  --data-urlencode "AccountSid=ACtest"
```

**Expected response:** `Webhook reachable`

---

## 3. OpenAI Connectivity Test (PING_OPENAI)

Verify the OpenAI API key is valid and the model responds.

> **Note:** In production (`NODE_ENV=production`), the `X-Admin-Secret` header must match `ADMIN_SECRET` to authorize this diagnostic. In development, no header is required.

```bash
# Development
curl -s -X POST https://$RAILWAY_URL/webhooks/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "Body=PING_OPENAI" \
  --data-urlencode "From=whatsapp:+2341234567890" \
  --data-urlencode "MessageSid=SMTEST00000000000000000000000000" \
  --data-urlencode "AccountSid=ACtest"

# Production (requires ADMIN_SECRET)
curl -s -X POST https://$RAILWAY_URL/webhooks/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "X-Admin-Secret: $ADMIN_SECRET" \
  --data-urlencode "Body=PING_OPENAI" \
  --data-urlencode "From=whatsapp:+2341234567890" \
  --data-urlencode "MessageSid=SMTEST00000000000000000000000000" \
  --data-urlencode "AccountSid=ACtest"
```

**Expected response:** `OpenAI Connected`  
**On failure:** `OpenAI Error: <error message>`  
**Without auth in production:** `Unauthorized`

---

## 4. WhatsApp Test Instructions (Twilio Sandbox)

### Step 1 — Join the Twilio WhatsApp Sandbox

1. Open WhatsApp on your phone.
2. Send the sandbox join code to your Twilio sandbox number:
   ```
   join <your-sandbox-code>
   ```
   (Find this in Twilio Console → Messaging → Try it out → Send a WhatsApp message)

### Step 2 — Send a test message

Once joined, send any message to the sandbox number, e.g.:
```
Hello! What services do you offer?
```

The bot should respond within a few seconds via the AI processing pipeline.

---

## 5. Twilio Console Log Check

To verify webhook delivery in Twilio:

1. Go to [https://console.twilio.com](https://console.twilio.com)
2. Navigate to **Monitor → Logs → Messaging**
3. Look for recent webhook requests to `/webhooks/whatsapp`
4. Confirm HTTP status **200** for all incoming messages
5. Check for any error codes (30007, 30008) that indicate delivery failures

To view detailed webhook inspector logs:
1. Navigate to **Monitor → Events → Debugger**
2. Filter by your WhatsApp number
3. Confirm `webhook.outgoing.success` events are present

---

## 6. Full Startup Validation (check Railway logs)

After deployment, check Railway logs for the startup block:

```
INFO: Database connected successfully
INFO: Redis ping successful
INFO: Redis connected and ready
INFO: {
  environment: "production",
  port: 3001,
  redisStatus: "connected",
  databaseStatus: "connected",
  openAiKeyLoaded: true,
  webhookRoute: "POST /webhooks/whatsapp",
  healthRoute: "GET /health"
} 🚀 ShadowSpark Chatbot startup complete
```

All six fields should be present. If `openAiKeyLoaded` is `false`, the `OPENAI_API_KEY` environment variable is missing or invalid.

---

## 7. Quick Reference — All curl Commands

```bash
# Set your Railway URL
export RAILWAY_URL="https://your-app.up.railway.app"

# Health check
curl -s https://$RAILWAY_URL/health | jq .

# Webhook ping
curl -s -X POST https://$RAILWAY_URL/webhooks/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "Body=PING_WEBHOOK" \
  --data-urlencode "From=whatsapp:+2341234567890" \
  --data-urlencode "MessageSid=SMtest001"

# OpenAI ping
curl -s -X POST https://$RAILWAY_URL/webhooks/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "Body=PING_OPENAI" \
  --data-urlencode "From=whatsapp:+2341234567890" \
  --data-urlencode "MessageSid=SMtest002"
```

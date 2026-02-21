# TEST_SCRIPT.md — ShadowSpark Chatbot Test Guide

Replace `https://your-railway-url.up.railway.app` with your actual deployed URL throughout.

---

## 1. Health Endpoint

```bash
curl -s https://your-railway-url.up.railway.app/health | jq .
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": 123.45,
  "provider": "twilio"
}
```

---

## 2. Webhook Reachability (PING_WEBHOOK)

```bash
curl -s -X POST https://your-railway-url.up.railway.app/webhooks/whatsapp \
  --data-urlencode "Body=PING_WEBHOOK" \
  --data-urlencode "From=whatsapp:+2348000000000" \
  --data-urlencode "To=whatsapp:+14155238886" \
  --data-urlencode "MessageSid=SMtest001" \
  --data-urlencode "AccountSid=ACtest"
```

**Expected response:** `Webhook reachable`

---

## 3. OpenAI Connectivity (PING_OPENAI)

```bash
curl -s -X POST https://your-railway-url.up.railway.app/webhooks/whatsapp \
  --data-urlencode "Body=PING_OPENAI" \
  --data-urlencode "From=whatsapp:+2348000000000" \
  --data-urlencode "To=whatsapp:+14155238886" \
  --data-urlencode "MessageSid=SMtest002" \
  --data-urlencode "AccountSid=ACtest"
```

**Expected response:** `OpenAI Connected`
**If OpenAI fails:** `OpenAI Error: <error message>`

---

## 4. WhatsApp End-to-End Test

1. Open WhatsApp on your phone.
2. Send a message to your Twilio WhatsApp Sandbox number (e.g. `+1 415 523 8886`).
3. You should receive an AI-generated reply within a few seconds.

**Sandbox join command** (first-time): Send `join <your-sandbox-keyword>` to the Twilio number.

---

## 5. Twilio Console Log Check

1. Log in at [https://console.twilio.com](https://console.twilio.com).
2. Navigate to **Monitor → Logs → Messaging**.
3. Confirm the webhook POST request appears with HTTP status `200`.
4. Check **Monitor → Logs → Errors** — it should be empty.
5. Navigate to **Messaging → Try it out → Send a WhatsApp message** to send a test.

---

## 6. Full Twilio Webhook Configuration

In your Twilio Console:

1. Go to **Messaging → Settings → WhatsApp Sandbox Settings** (sandbox) or your approved number.
2. Set **When a message comes in** to:
   ```
   https://your-railway-url.up.railway.app/webhooks/whatsapp
   ```
3. Method: **HTTP POST**
4. Save changes.

---

## 7. Startup Verification (Railway Logs)

After deployment, check your Railway service logs. You should see:

```
✅ Database connected successfully
✅ Redis connected and ready
🚀 ShadowSpark Chatbot startup complete { environment: 'production', port: 3001, ... }
📱 WhatsApp webhook (Twilio): POST /webhooks/whatsapp
❤️  Health check: GET /health
```

If the database or Redis connection fails, the process will exit with a fatal log entry. Check your `DATABASE_URL` and `REDIS_URL` environment variables in Railway.

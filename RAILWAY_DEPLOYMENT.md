# Railway Deployment Guide — ShadowSpark Chatbot

**Project:** ShadowSpark WhatsApp AI Chatbot
**Platform:** Railway.app
**Last Updated:** 2025-01-XX

---

## Prerequisites

- Railway account (<https://railway.app>)
- Railway CLI installed: `npm i -g @railway/cli`
- Neon PostgreSQL database
- Upstash Redis instance
- Twilio WhatsApp account
- OpenAI API key

---

## 1. Initial Setup

### 1.1 Install Railway CLI

```bash
npm i -g @railway/cli
```

### 1.2 Login to Railway

```bash
railway login
```

### 1.3 Initialize Project

```bash
# In project root
railway init

# Select: Create new project
# Name: shadowspark-chatbot
```

---

## 2. Environment Variables Configuration

### 2.1 Required Variables (Production)

**CRITICAL:** All variables marked with ⚠️ are REQUIRED in production. The application will refuse to start without them.

#### Database Configuration

```bash
railway variables set DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
railway variables set DIRECT_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

**Notes:**

- Get from Neon dashboard → Connection Details
- `DATABASE_URL`: Use pooled connection (port 5432)
- `DIRECT_URL`: Use direct connection for migrations

#### Twilio Configuration

```bash
railway variables set TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
railway variables set TWILIO_AUTH_TOKEN="your_auth_token_here"
railway variables set TWILIO_WHATSAPP_NUMBER="whatsapp:+1234567890"
```

**Validation:**

- `TWILIO_ACCOUNT_SID` must start with "AC" and be 34 chars
- `TWILIO_AUTH_TOKEN` must be at least 32 chars
- `TWILIO_WHATSAPP_NUMBER` must be in format: `whatsapp:+1234567890`

#### OpenAI Configuration

```bash
railway variables set OPENAI_API_KEY="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
railway variables set OPENAI_MODEL="gpt-4o-mini"
railway variables set OPENAI_MAX_TOKENS="500"
railway variables set OPENAI_TEMPERATURE="0.7"
```

**Validation:**

- `OPENAI_API_KEY` must start with "sk-"
- `OPENAI_MODEL` default: gpt-4o-mini (recommended for cost)
- `OPENAI_MAX_TOKENS` default: 500 (adjust based on needs)
- `OPENAI_TEMPERATURE` range: 0.0-2.0 (0.7 recommended)

#### Redis Configuration

```bash
railway variables set REDIS_URL="rediss://default:password@host:port"
```

**Notes:**

- Get from Upstash dashboard → Redis → Details
- Use TLS connection (rediss://)

#### Server Configuration

```bash
railway variables set NODE_ENV="production"
railway variables set LOG_LEVEL="info"
```

**⚠️ CRITICAL:**

- `NODE_ENV` MUST be "production" in Railway
- Application will exit with fatal error if not set
- `LOG_LEVEL` options: fatal, error, warn, info, debug, trace

#### Webhook Configuration

```bash
# After first deployment, get your Railway URL
railway variables set WEBHOOK_BASE_URL="https://your-app.railway.app"
```

**⚠️ CRITICAL:**

- Required in production
- Must be valid HTTPS URL
- Get from Railway dashboard after first deploy

#### Security Configuration

```bash
railway variables set ADMIN_SECRET="your-secure-secret-min-16-chars"
```

**⚠️ CRITICAL:**

- Required in production
- Minimum 16 characters
- Use strong random string
- Protects `/setup/seed-demo` endpoint

**Generate secure secret:**

```bash
# Linux/Mac
openssl rand -base64 24

# Node.js
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"
```

#### Application Configuration

```bash
railway variables set DEFAULT_CLIENT_ID="shadowspark-demo"
```

**Optional:**

- Default: "shadowspark-demo"
- Change if using different client ID

---

### 2.2 Verify All Variables Set

```bash
railway variables
```

**Expected output:**

```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
TWILIO_ACCOUNT_SID=ACxxxxxxxx...
TWILIO_AUTH_TOKEN=********
TWILIO_WHATSAPP_NUMBER=whatsapp:+...
OPENAI_API_KEY=sk-********
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.7
REDIS_URL=rediss://...
NODE_ENV=production
LOG_LEVEL=info
WEBHOOK_BASE_URL=https://...
ADMIN_SECRET=********
DEFAULT_CLIENT_ID=shadowspark-demo
```

---

## 3. Database Migration

### 3.1 Run Migration in Railway

```bash
# Option 1: Via Railway CLI
railway run npx prisma migrate deploy

# Option 2: Via Railway dashboard
# Add to build command: npm run build && npx prisma migrate deploy
```

### 3.2 Verify Migration

```bash
railway run npx prisma db pull
```

**Expected:** No schema changes detected

---

## 4. Deployment

### 4.1 Deploy to Railway

```bash
# Deploy current branch
railway up

# Or push to GitHub and connect Railway to repo
git push origin main
```

### 4.2 Monitor Deployment

```bash
# Watch logs in real-time
railway logs

# Or view in Railway dashboard
```

**Expected logs:**

```
✅ Configuration loaded successfully (production mode)
🚀 ShadowSpark Chatbot running on port 3001
📱 WhatsApp webhook (Twilio): POST /webhooks/whatsapp
❤️  Health check: GET /health
```

---

## 5. Post-Deployment Verification

### 5.1 Get Railway URL

```bash
railway domain
```

**Example output:**

```
https://shadowspark-chatbot-production.up.railway.app
```

### 5.2 Update WEBHOOK_BASE_URL

```bash
railway variables set WEBHOOK_BASE_URL="https://your-actual-url.railway.app"
railway up  # Redeploy with new URL
```

### 5.3 Health Check

```bash
curl https://your-app.railway.app/health
```

**Expected response:**

```json
{
  "status": "ok",
  "timestamp": "2025-01-XX...",
  "uptime": 123.45,
  "provider": "twilio"
}
```

### 5.4 Seed Demo Configuration

```bash
curl -H "x-admin-secret: YOUR_ADMIN_SECRET" \
     https://your-app.railway.app/setup/seed-demo
```

**Expected response:**

```json
{
  "message": "Demo config created",
  "config": {
    "clientId": "shadowspark-demo",
    "businessName": "ShadowSpark Demo",
    ...
  }
}
```

**If already seeded:**

```json
{
  "message": "Demo config already exists",
  "config": {...}
}
```

---

## 6. Configure Twilio Webhook

### 6.1 Set Webhook URL in Twilio Console

1. Go to https://console.twilio.com
2. Navigate to: Messaging → Settings → WhatsApp Sandbox Settings
3. Set **"When a message comes in"** to:
   ```
   https://your-app.railway.app/webhooks/whatsapp
   ```
4. Method: **POST**
5. Click **Save**

### 6.2 Test Webhook

1. Send a WhatsApp message to your Twilio sandbox number
2. Expected: AI response within 5 seconds

### 6.3 Verify Logs

```bash
railway logs --tail
```

**Expected logs:**

```
{"level":"info","msg":"WhatsApp message sent via Twilio","to":"+...","sid":"SM..."}
{"level":"info","msg":"Message processed successfully","conversationId":"...","tokensUsed":150}
```

---

## 7. Testing Checklist

### 7.1 Basic Functionality

- [ ] Health check returns 200 OK
- [ ] Seed demo config succeeds (or already exists)
- [ ] WhatsApp message receives AI response
- [ ] Response time < 5 seconds
- [ ] Logs show no errors

### 7.2 Security Features

- [ ] Seed endpoint requires `x-admin-secret` header
- [ ] Invalid admin secret returns 401 Unauthorized
- [ ] Twilio signature validation enabled (production)
- [ ] Invalid signature returns 403 Forbidden

### 7.3 Token Tracking

- [ ] Token usage increments after AI response
- [ ] Monthly token cap enforced (if configured)
- [ ] Token limit message sent when cap exceeded
- [ ] Month resets automatically on first usage

### 7.4 Handoff Features

- [ ] Keyword "agent" triggers handoff
- [ ] Keyword "human" triggers handoff
- [ ] Keyword "support" triggers handoff
- [ ] Handoff message sent to user
- [ ] Subsequent messages saved but no AI response

### 7.5 Error Handling

- [ ] Invalid webhook payload handled gracefully
- [ ] Database connection errors logged
- [ ] Redis connection errors logged
- [ ] OpenAI API errors handled with fallback message

---

## 8. Monitoring & Alerts

### 8.1 View Logs

```bash
# Real-time logs
railway logs --tail

# Last 100 lines
railway logs

# Filter by level
railway logs | grep "level\":\"error"
```

### 8.2 Key Metrics to Monitor

**Application Health:**

- Uptime (from `/health` endpoint)
- Response time (< 5 seconds target)
- Error rate (< 1% target)

**Token Usage:**

- Monthly token usage per client
- Token cap exceeded events
- Average tokens per conversation

**Handoff Events:**

- Handoff trigger frequency
- Handoff keyword distribution
- Average time to handoff

**Security:**

- Invalid signature attempts
- Unauthorized admin access attempts
- Rate limit violations

### 8.3 Set Up Alerts (Optional)

**Railway Notifications:**

1. Go to Railway dashboard → Project Settings → Notifications
2. Enable: Deployment failures, Service crashes
3. Add Slack/Discord webhook (optional)

**Custom Alerts (via logs):**

```bash
# Example: Alert on token cap exceeded
railway logs | grep "Monthly token limit exceeded" | \
  xargs -I {} curl -X POST https://hooks.slack.com/... -d "{\"text\":\"{}\"}"
```

---

## 9. Rollback Procedure

### 9.1 Rollback to Previous Deployment

```bash
# View deployment history
railway deployments

# Rollback to specific deployment
railway rollback <deployment-id>
```

### 9.2 Rollback Database Migration

```bash
# Connect to database
railway run npx prisma studio

# Or manually via SQL
railway run psql $DATABASE_URL

# Revert migration (if needed)
# Note: Prisma doesn't support automatic rollback
# Manual SQL required for schema changes
```

### 9.3 Emergency Shutdown

```bash
# Stop service
railway down

# Or via dashboard: Service → Settings → Stop Service
```

---

## 10. Troubleshooting

### 10.1 Application Won't Start

**Error:** `NODE_ENV must be 'production' in Railway deployment`

**Solution:**

```bash
railway variables set NODE_ENV="production"
railway up
```

---

**Error:** `WEBHOOK_BASE_URL is required when NODE_ENV=production`

**Solution:**

```bash
railway variables set WEBHOOK_BASE_URL="https://your-app.railway.app"
railway up
```

---

**Error:** `ADMIN_SECRET is required when NODE_ENV=production`

**Solution:**

```bash
railway variables set ADMIN_SECRET="$(openssl rand -base64 24)"
railway up
```

---

### 10.2 Database Connection Errors

**Error:** `P1001: Can't reach database server`

**Solution:**

1. Verify `DATABASE_URL` is correct
2. Check Neon database is not paused (free tier auto-pauses)
3. Test connection:
   ```bash
   railway run npx prisma db pull
   ```

---

### 10.3 Redis Connection Errors

**Error:** `Redis connection failed`

**Solution:**

1. Verify `REDIS_URL` is correct
2. Check Upstash Redis is active
3. Test connection:
   ```bash
   railway run node -e "const Redis = require('ioredis'); const r = new Redis(process.env.REDIS_URL); r.ping().then(console.log)"
   ```

---

### 10.4 Twilio Webhook Not Receiving Messages

**Checklist:**

- [ ] Webhook URL set in Twilio console
- [ ] URL is HTTPS (not HTTP)
- [ ] URL matches `WEBHOOK_BASE_URL` env var
- [ ] Railway service is running (check logs)
- [ ] No rate limiting blocking requests

**Debug:**

```bash
# Check webhook logs
railway logs | grep "webhooks/whatsapp"

# Test webhook manually
curl -X POST https://your-app.railway.app/webhooks/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "MessageSid=SMxxx&From=whatsapp:+1234567890&Body=test"
```

---

### 10.5 Token Tracking Not Working

**Checklist:**

- [ ] Database migration applied (`npx prisma migrate deploy`)
- [ ] `monthlyTokenUsage`, `monthlyTokenCap`, `lastResetMonth` fields exist
- [ ] Client config seeded (`/setup/seed-demo`)

**Debug:**

```bash
# Check database schema
railway run npx prisma db pull

# Check client config
railway run npx prisma studio
# Navigate to ClientConfig table
```

---

## 11. Maintenance

### 11.1 Update Dependencies

```bash
# Update packages
npm update

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Redeploy
railway up
```

### 11.2 Database Backups

**Neon (automatic):**

- Free tier: 7-day point-in-time recovery
- Paid tier: 30-day point-in-time recovery

**Manual backup:**

```bash
railway run pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### 11.3 Rotate Secrets

**ADMIN_SECRET:**

```bash
# Generate new secret
NEW_SECRET=$(openssl rand -base64 24)

# Update Railway
railway variables set ADMIN_SECRET="$NEW_SECRET"

# Update local .env
echo "ADMIN_SECRET=$NEW_SECRET" >> .env

# Redeploy
railway up
```

**TWILIO_AUTH_TOKEN:**

1. Generate new token in Twilio console
2. Update Railway: `railway variables set TWILIO_AUTH_TOKEN="new_token"`
3. Redeploy: `railway up`

---

## 12. Cost Optimization

### 12.1 Railway Costs

**Free Tier:**

- $5 credit/month
- Sufficient for development/testing

**Paid Tier:**

- ~$5-10/month for small production app
- Scales with usage

### 12.2 OpenAI Costs

**gpt-4o-mini pricing:**

- Input: $0.150 / 1M tokens
- Output: $0.600 / 1M tokens

**Estimated costs:**

- 1,000 conversations/month: ~$5-10
- 10,000 conversations/month: ~$50-100

**Optimization:**

- Set `OPENAI_MAX_TOKENS=500` (default)
- Use `monthlyTokenCap` to limit per-client usage
- Monitor token usage via logs

### 12.3 Database Costs

**Neon Free Tier:**

- 0.5 GB storage
- 100 hours compute/month
- Auto-pauses after 5 min inactivity

**Paid Tier:**
way: `railway variables set TWILIO_AUTH_TOKEN="new_token"`
3. Redeploy: `railway up`

---

## 12. Cost Optimization

### 12.1 Railway Costs

**Free Tier:**

- $5 credit/month
- Sufficient for development/testing

**Paid Tier:**

- ~$5-10/month for small production app
- Scales with usage

### 12.2 OpenAI Costs

**gpt-4o-mini pricing:**

- Input: $0.150 / 1M tokens
- Output: $0.600 / 1M tokens

**Estimated costs:**

- 1,000 conversations/month: ~$5-10
- 10,000 conversations/month: ~$50-100

**Optimization:**

- Set `OPENAI_MAX_TOKENS=500` (default)
- Use `monthlyTokenCap` to limit per-client usage
- Monitor token usage via logs

### 12.3 Database Costs

**Neon Free Tier:**

- 0.5 GB storage
- 100 hours compute/month
- Auto-pauses after 5 min inactivity

**Paid Tier:**

- ~$19/month for always-on
- Scales with storage

---

## 13. Security Best Practices

### 13.1 Environment Variables

- ✅ Never commit `.env` to git
- ✅ Use Railway secrets for sensitive data
- ✅ Rotate secrets regularly (quarterly)
- ✅ Use strong random strings (min 16 chars)

### 13.2 API Keys

- ✅ Restrict OpenAI API key to specific IP (if possible)
- ✅ Set usage limits in OpenAI dashboard
- ✅ Monitor API usage for anomalies
- ✅ Rotate keys if compromised

### 13.3 Webhook Security

- ✅ Always validate Twilio signatures in production
- ✅ Use HTTPS only (never HTTP)
- ✅ Rate limit webhook endpoint
- ✅ Log all webhook requests for audit

### 13.4 Database Security

- ✅ Use connection pooling (Neon default)
- ✅ Enable SSL/TLS (required by Neon)
- ✅ Restrict database access to Railway IPs
- ✅ Regular backups (Neon automatic)

---

## 14. Support & Resources

### Documentation

- Railway: <https://docs.railway.app>
- Twilio: <https://www.twilio.com/docs/whatsapp>
- OpenAI: <https://platform.openai.com/docs>
- Prisma: <https://www.prisma.io/docs>

### Community

- Railway Discord: <https://discord.gg/railway>
- Twilio Support: <https://support.twilio.com>

### Internal

- Project README: `README.md`
- Implementation Summary: `IMPLEMENTATION_SUMMARY.md`
- Gap Analysis: `PHASE_1D_GAP_ANALYSIS.md`
- Blackbox Context: `BLACKBOX.md`

---

## 15. Quick Reference

### Essential Commands

```bash
# Deploy
railway up

# View logs
railway logs --tail

# Set variable
railway variables set KEY="value"

# View all variables
railway variables

# Rollback
railway rollback <deployment-id>

# Run command in Railway environment
railway run <command>

# Open Railway dashboard
railway open
```

### Essential URLs

```bash
# Health check
https://your-app.railway.app/health

# Seed demo config
https://your-app.railway.app/setup/seed-demo

# WhatsApp webhook
https://your-app.railway.app/webhooks/whatsapp
```

### Essential Headers

```bash
# Admin secret (for seed endpoint)
x-admin-secret: YOUR_ADMIN_SECRET

# Twilio signature (automatic)
x-twilio-signature: <signature>
```

---

**Last Updated:** 2025-01-XX
**Maintained By:** ShadowSpark Technologies
**Version:** 1.0.0

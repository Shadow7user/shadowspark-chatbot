# Production Deployment Checklist — ShadowSpark Chatbot

**Date:** 2026-02-18
**Status:** ✅ READY FOR DEPLOYMENT
**Phase:** 1D Enterprise Hardening Complete

---

## ✅ Pre-Deployment Verification (COMPLETED)

### Database

- [x] Schema updated with token tracking fields
- [x] Database in sync with Prisma schema
- [x] Prisma client generated (v6.19.2)
- [x] All migrations applied successfully

### Code Quality

- [x] TypeScript compilation successful (no errors)
- [x] All tests passed (16/16 - 100%)
- [x] Build successful (`npm run build`)
- [x] No `any` types in codebase
- [x] Strict mode enabled

### Security Features

- [x] Production environment guards implemented
- [x] Twilio signature validation enabled
- [x] Admin secret protection working
- [x] Rate limiting configured (100 req/min)
- [x] Token cap enforcement implemented

### Core Features

- [x] Token tracking system verified
- [x] Handoff logic tested (7/7 test cases passed)
- [x] Message deduplication working
- [x] Auto month reset logic verified

---

## 🚀 Railway Deployment Steps

### Step 1: Install Railway CLI (if not installed)

```bash
npm i -g @railway/cli
railway login
```

**Status:** ⏳ PENDING

---

### Step 2: Initialize Railway Project

```bash
cd /home/shadowweaver/projects/shadowspark-chatbot
railway init
```

**Select:** Create new project
**Name:** shadowspark-chatbot-production

**Status:** ⏳ PENDING

---

### Step 3: Set Environment Variables

Copy and execute these commands:

```bash
# Database (from Neon)
railway variables set DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
railway variables set DIRECT_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# Twilio (from Twilio Console)
railway variables set TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
railway variables set TWILIO_AUTH_TOKEN="your_auth_token_here"
railway variables set TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"

# OpenAI (from OpenAI Platform)
railway variables set OPENAI_API_KEY="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
railway variables set OPENAI_MODEL="gpt-4o-mini"
railway variables set OPENAI_MAX_TOKENS="500"
railway variables set OPENAI_TEMPERATURE="0.7"

# Redis (from Upstash)
railway variables set REDIS_URL="rediss://default:password@host:port"

# Server Configuration
railway variables set NODE_ENV="production"
railway variables set LOG_LEVEL="info"
railway variables set DEFAULT_CLIENT_ID="shadowspark-demo"

# Security (CRITICAL - Generate strong secrets)
railway variables set ADMIN_SECRET="$(openssl rand -base64 24)"

# Webhook (Set after first deployment)
# railway variables set WEBHOOK_BASE_URL="https://your-app.railway.app"
```

**Status:** ⏳ PENDING

---

### Step 4: Deploy to Railway

```bash
railway up
```

**Expected Output:**

- Build starts
- Prisma generates client
- TypeScript compiles
- Service starts on Railway

**Status:** ⏳ PENDING

---

### Step 5: Get Railway URL and Update Webhook

```bash
# Get your Railway URL
railway domain

# Update WEBHOOK_BASE_URL
railway variables set WEBHOOK_BASE_URL="https://your-actual-url.railway.app"

# Redeploy with new URL
railway up
```

**Status:** ⏳ PENDING

---

### Step 6: Run Database Migration in Production

```bash
railway run npx prisma migrate deploy
```

**Status:** ⏳ PENDING

---

### Step 7: Seed Demo Configuration

```bash
# Get your ADMIN_SECRET
railway variables | grep ADMIN_SECRET

# Seed demo config
curl -H "x-admin-secret: YOUR_ADMIN_SECRET" \
     https://your-app.railway.app/setup/seed-demo
```

**Expected Response:**

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

**Status:** ⏳ PENDING

---

### Step 8: Configure Twilio Webhook

1. Go to <https://console.twilio.com>
2. Navigate to: Messaging → Settings → WhatsApp Sandbox Settings
3. Set **"When a message comes in"** to:

   ```
   https://your-app.railway.app/webhooks/whatsapp
   ```

4. Method: **POST**
5. Click **Save**

**Status:** ⏳ PENDING

---

## 🧪 Post-Deployment Testing

### Test 1: Health Check

```bash
curl https://your-app.railway.app/health
```

**Expected:**

```json
{
  "status": "ok",
  "timestamp": "2026-02-18T...",
  "uptime": 123.45,
  "provider": "twilio"
}
```

**Status:** ⏳ PENDING
**Result:** **********\_**********

---

### Test 2: Send WhatsApp Test Message

1. Send "Hello" to your Twilio WhatsApp number
2. Expected: AI response within 5 seconds

**Status:** ⏳ PENDING
**Result:** **********\_**********

---

### Test 3: Test Handoff Keyword

1. Send "I need to speak with an agent"
2. Expected: Handoff message, no AI response

**Status:** ⏳ PENDING
**Result:** **********\_**********

---

### Test 4: Verify Token Tracking

```bash
# Check Railway logs
railway logs --tail

# Look for:
# "Incremented token usage for client shadowspark-demo: +XXX tokens"
```

**Status:** ⏳ PENDING
**Result:** **********\_**********

---

### Test 5: Verify Security

```bash
# Test admin secret protection
curl -H "x-admin-secret: wrong-secret" \
     https://your-app.railway.app/setup/seed-demo

# Expected: 401 Unauthorized
```

**Status:** ⏳ PENDING
**Result:** **********\_**********

---

## 📊 Monitoring Setup

### Step 1: Configure Railway Notifications

1. Go to Railway dashboard → Project Settings → Notifications
2. Enable: Deployment failures, Service crashes
3. Add Slack/Discord webhook (optional)

**Status:** ⏳ PENDING

---

### Step 2: Set Up Log Monitoring

```bash
# Monitor logs in real-time
railway logs --tail

# Filter for errors
railway logs | grep "level\":\"error"

# Filter for token cap exceeded
railway logs | grep "Monthly token limit exceeded"

# Filter for handoff events
railway logs | grep "Conversation escalated to HANDOFF"
```

**Status:** ⏳ PENDING

---

### Step 3: Create Monitoring Dashboard (Optional)

Create a simple monitoring script:

```bash
#!/bin/bash
# monitor.sh - Check health and alert on issues

RAILWAY_URL="https://your-app.railway.app"
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Check health
HEALTH=$(curl -s $RAILWAY_URL/health | jq -r .status)

if [ "$HEALTH" != "ok" ]; then
  curl -X POST $SLACK_WEBHOOK \
    -d "{\"text\":\"⚠️ ShadowSpark Chatbot health check failed!\"}"
fi
```

**Status:** ⏳ PENDING

---

## 🔒 Security Hardening

### Step 1: Verify Production Guards

```bash
# Check Railway environment
railway variables | grep NODE_ENV
# Expected: NODE_ENV=production

railway variables | grep WEBHOOK_BASE_URL
# Expected: WEBHOOK_BASE_URL=https://...

railway variables | grep ADMIN_SECRET
# Expected: ADMIN_SECRET=******** (hidden)
```

**Status:** ⏳ PENDING

---

### Step 2: Set Token Caps for Production

```bash
# Update demo client with token cap
railway run npx prisma studio

# Or via SQL:
railway run psql $DATABASE_URL -c \
  "UPDATE client_configs SET monthly_token_cap = 50000 WHERE client_id = 'shadowspark-demo';"
```

**Recommended Caps:**

- Demo/Testing: 10,000 tokens/month
- Small Business: 50,000 tokens/month
- Medium Business: 200,000 tokens/month
- Enterprise: Custom (500,000+)

**Status:** ⏳ PENDING

---

### Step 3: Rotate Secrets (Quarterly)

```bash
# Generate new admin secret
NEW_SECRET=$(openssl rand -base64 24)

# Update Railway
railway variables set ADMIN_SECRET="$NEW_SECRET"

# Update local .env
echo "ADMIN_SECRET=$NEW_SECRET" >> .env

# Redeploy
railway up
```

**Next Rotation Date:** **********\_**********
**Status:** ⏳ PENDING

---

## 📈 Performance Optimization

### Step 1: Monitor Response Times

```bash
# Check average response time
railway logs | grep "responseTime" | tail -20
```

**Target:** < 5 seconds for AI responses
**Current:** **********\_**********

**Status:** ⏳ PENDING

---

### Step 2: Optimize Token Usage

```bash
# Check average tokens per conversation
railway logs | grep "tokensUsed" | tail -20
```

**Target:** < 500 tokens per response
**Current:** **********\_**********

**Status:** ⏳ PENDING

---

### Step 3: Database Connection Pooling

Verify Neon connection pooling is enabled:

- Pooled connection: Port 5432 (for app)
- Direct connection: Port 5432 (for migrations)

**Status:** ⏳ PENDING

---

## 🎯 Success Criteria

### Critical (Must Pass)

- [ ] Health endpoint returns 200 OK
- [ ] WhatsApp messages receive AI responses
- [ ] Token tracking increments correctly
- [ ] Handoff keywords trigger escalation
- [ ] Admin secret protection working
- [ ] Twilio signature validation enabled
- [ ] No errors in Railway logs

### Important (Should Pass)

- [ ] Response time < 5 seconds
- [ ] Token usage < 500 per response
- [ ] Month reset logic working
- [ ] Token caps enforced (if set)
- [ ] Monitoring configured
- [ ] Logs structured and readable

### Nice to Have

- [ ] Slack/Discord notifications configured
- [ ] Custom monitoring dashboard
- [ ] Performance metrics tracked
- [ ] Cost optimization implemented

---

## 🚨 Rollback Plan

### If Deployment Fails

```bash
# View deployment history
railway deployments

# Rollback to previous deployment
railway rollback <deployment-id>

# Or stop service
railway down
```

### If Database Issues

```bash
# Connect to database
railway run psql $DATABASE_URL

# Check schema
\dt

# Verify token tracking fields
\d client_configs
```

### Emergency Contacts

- **Railway Support:** <https://discord.gg/railway>
- **Twilio Support:** <https://support.twilio.com>
- **Internal:** Check BLACKBOX.md for team contacts

---

## 📝 Post-Deployment Notes

### Deployment Date: **********\_**********

### Railway URL: **********\_**********

### Issues Encountered

- ***
- ***

### Resolutions

- ***
- ***

### Performance Metrics

- Average Response Time: **********\_**********
- Average Tokens/Response: **********\_**********
- Error Rate: **********\_**********

### Next Steps

- [ ] ***
- [ ] ***
- [ ] ***

---

## ✅ Final Checklist

Before marking deployment as complete, verify:

- [ ] All environment variables set correctly
- [ ] Database migration successful
- [ ] Demo config seeded
- [ ] Twilio webhook configured
- [ ] Health check passing
- [ ] WhatsApp messages working
- [ ] Token tracking verified
- [ ] Handoff logic tested
- [ ] Security features enabled
- [ ] Monitoring configured
- [ ] Documentation updated
- [ ] Team notified

---

**Deployment Status:** ⏳ IN PROGRESS
**Completed By:** **********\_**********
**Approved By:** **********\_**********
**Date:** **********\_**********

---

## 📚 Reference Documents

- **RAILWAY_DEPLOYMENT.md** - Detailed deployment guide
- **PHASE_1D_GAP_ANALYSIS.md** - Implementation analysis
- **TEST_REPORT_PHASE1D.md** - Test results
- **IMPLEMENTATION_SUMMARY.md** - Feature documentation
- **README.md** - Project overview

---

**Next Review:** 1 week after deployment
**Status:** Ready for production deployment

# 🚀 Infrastructure Activation Checklist

**Role:** Senior DevOps Engineer - Infrastructure Activation  
**Phase:** Phase 3 - Deployment Engineering  
**Status:** ⚡ **ACTIVATION READY**  
**Date:** February 21, 2026

---

## 🎯 Mission Statement

**You are no longer building. You are activating infrastructure.**

Your system is:
- ✅ Structurally sound
- ✅ Production-grade
- ✅ Security-hardened
- ✅ Queue-enabled
- ✅ AI-integrated

**One deployment away from operational.**

---

## 📊 Pre-Deployment Verification

### ✅ Architecture Confirmed

**Framework:** Fastify (high-performance Node.js)
- ✅ Faster than Express
- ✅ Low overhead for webhook-heavy systems
- ✅ Async handlers ready
- ✅ CORS enabled
- ✅ Rate limiting configured (100 req/min)

**Database Layer:** Prisma ORM
- ✅ 11 models defined
- ✅ Async transactions
- ✅ Neon PostgreSQL ready
- ✅ Migration system in place

**Queue System:** BullMQ + Redis
- ✅ Advanced architecture (scalable)
- ✅ Background job processing
- ✅ Webhook returns immediately
- ✅ 5 concurrent workers
- ✅ 20 jobs/sec rate limit

**Security:** Twilio Signature Validation
- ✅ X-Twilio-Signature header validation
- ✅ Auth token verification
- ✅ Strict mode in production
- ✅ Prevents fake requests

**AI Integration:** OpenAI GPT-4o-mini
- ✅ Via Vercel AI SDK
- ✅ Token tracking
- ✅ Cost control
- ✅ Error handling with retry logic

---

## 🔧 Critical Configuration Verification

### Port Binding ✅ CORRECT

**File:** `src/server.ts:184`

```typescript
await app.listen({ port: config.PORT, host: "0.0.0.0" });
```

✅ Uses `config.PORT` (process.env.PORT)  
✅ Binds to `0.0.0.0` (Railway compatible)  
✅ Graceful shutdown handlers (SIGTERM, SIGINT)

**Why this matters:**
- Railway assigns dynamic port via `process.env.PORT`
- Binding to `0.0.0.0` allows external connections
- Graceful shutdown prevents data loss

---

## 🚦 Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Twilio WhatsApp                       │
│                   (Incoming Messages)                    │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Railway Deployment (LIVE)                   │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Fastify Server (Port: Railway assigns)            │ │
│  │  - POST /webhooks/whatsapp (Twilio receiver)       │ │
│  │  - GET /health (Health check)                      │ │
│  └─────────────────────┬──────────────────────────────┘ │
│                        │                                 │
│                        ▼                                 │
│  ┌────────────────────────────────────────────────────┐ │
│  │  BullMQ Worker (Background Processing)             │ │
│  │  - Enqueues messages instantly                     │ │
│  │  - Processes with 5 concurrent workers             │ │
│  │  - Rate limit: 20 jobs/second                      │ │
│  └─────────────────────┬──────────────────────────────┘ │
│                        │                                 │
│                        ▼                                 │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Message Router (Pipeline)                         │ │
│  │  - User resolution (find or create)                │ │
│  │  - Conversation management (30-min timeout)        │ │
│  │  - Token cap check                                 │ │
│  │  - Human handoff detection                         │ │
│  └─────────────────────┬──────────────────────────────┘ │
│                        │                                 │
│                        ▼                                 │
│  ┌────────────────────────────────────────────────────┐ │
│  │  AI Brain (OpenAI GPT-4o-mini)                     │ │
│  │  - Context loading (last 10 messages)              │ │
│  │  - Response generation                             │ │
│  │  - Token tracking                                  │ │
│  └─────────────────────┬──────────────────────────────┘ │
│                        │                                 │
│                        ▼                                 │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Response Delivery (Twilio API)                    │ │
│  │  - Send WhatsApp message                           │ │
│  │  - Status callback                                 │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                External Services                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Neon PostgreSQL (Database)                      │   │
│  │ - User profiles, conversations, messages        │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Redis Labs (Queue Storage)                      │   │
│  │ - Job queue, worker coordination                │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ OpenAI API (AI Processing)                      │   │
│  │ - GPT-4o-mini responses                         │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 🔴 PRIORITY 1: Deploy to Railway

### Step-by-Step Activation

#### 1. Railway Account Setup (5 min)
```bash
# Go to https://railway.app
# Sign in with GitHub
# Authorize Railway to access your repositories
```

#### 2. Create New Project (2 min)
```
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Search: Shadow7user/shadowspark-chatbot
4. Select branch: copilot/update-location-to-owerri
5. Click "Deploy"
```

#### 3. Environment Variables (10 min)

**CRITICAL: Set ALL of these in Railway Variables**

```env
# Database (from Neon console)
DATABASE_URL=postgresql://neondb_owner:[PASSWORD]@[ENDPOINT]/shadowspark_chatbot?sslmode=require&pgbouncer=true
DIRECT_URL=postgresql://neondb_owner:[PASSWORD]@[ENDPOINT]/shadowspark_chatbot?sslmode=require

# Twilio (from console.twilio.com)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_actual_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# OpenAI (configured)
OPENAI_API_KEY=your_openai_key_here
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.7

# Redis (configured)
REDIS_URL=redis://default:[PASSWORD]@redis-19270.c325.us-east-1-4.ec2.cloud.redislabs.com:19270

# Server Config
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
DEFAULT_CLIENT_ID=shadowspark-demo

# Admin
ADMIN_SECRET=your_admin_secret_here

# Webhook (leave blank initially - Railway will provide)
WEBHOOK_BASE_URL=
```

**Note:** Railway will auto-assign PORT. Your code already handles this correctly.

#### 4. Initial Deployment (3-5 min)

Railway will:
- ✅ Clone your repository
- ✅ Detect Node.js project
- ✅ Run `npm install`
- ✅ Run `npm run build`
- ✅ Generate Prisma client
- ✅ Start with `npm start`

**Watch the logs for:**
```
✅ Prisma Client generated
✅ TypeScript compilation successful
✅ ShadowSpark Chatbot running on port XXXX
✅ WhatsApp webhook (Twilio): POST /webhooks/whatsapp
✅ Health check: GET /health
```

#### 5. Generate Public Domain (1 min)

```
1. Go to Settings tab
2. Networking section
3. Click "Generate Domain"
4. Copy URL: https://shadowspark-chatbot-production.up.railway.app
```

#### 6. Update WEBHOOK_BASE_URL (1 min)

```
1. Go to Variables tab
2. Edit WEBHOOK_BASE_URL
3. Set to: https://your-actual-railway-url.up.railway.app
4. Railway auto-redeploys
```

---

## 🟠 PRIORITY 2: Verify Health Endpoint

### Test Command

```bash
curl https://YOUR_RAILWAY_URL.railway.app/health
```

### Expected Response

```json
{
  "status": "ok",
  "timestamp": "2026-02-21T...",
  "uptime": 123.456,
  "provider": "twilio"
}
```

### If Health Check FAILS ❌

**Possible causes:**

1. **Environment variable missing**
   - Check Railway logs for "Environment variable validation failed"
   - Verify all required variables are set

2. **Port binding issue**
   - Check logs for "EADDRINUSE" or "listen error"
   - Verify host is "0.0.0.0" (already correct in your code)

3. **Database connection**
   - Check logs for "P1001: Can't reach database"
   - Verify DATABASE_URL is correct
   - Wake Neon database (it may be sleeping)

4. **Redis connection**
   - Check logs for Redis connection errors
   - Verify REDIS_URL format is correct

### Debugging Commands

```bash
# View Railway logs
railway logs

# Or use web interface: Click service → View Logs

# Test specific routes
curl -v https://YOUR_URL.railway.app/health

# Check DNS resolution
nslookup your-url.railway.app
```

---

## 🟡 PRIORITY 3: Configure Twilio Webhook

### Twilio Console Configuration

1. Go to https://console.twilio.com
2. Navigate: Messaging → Try it out → WhatsApp sandbox settings
3. Find: "WHEN A MESSAGE COMES IN"

**Set Webhook URL:**
```
https://YOUR_RAILWAY_URL.railway.app/webhooks/whatsapp
```

**Method:** POST

**Content Type:** application/x-www-form-urlencoded

4. Click "Save"

### Test WhatsApp Integration

Send to your Twilio WhatsApp number:
```
join [your-sandbox-keyword]
Hello ShadowSpark!
```

### Expected Flow

1. **Twilio receives message** → Sends webhook to Railway
2. **Railway /webhooks/whatsapp** → Validates signature
3. **Message enqueued** → BullMQ adds to Redis queue
4. **Worker picks up** → Processes in background
5. **AI generates response** → OpenAI GPT-4o-mini
6. **Response sent** → Twilio API delivers to WhatsApp
7. **User receives reply** → Complete

### Railway Log Output (Success)

```
Webhook received: whatsapp:+234XXXXXXXXXX
Message enqueued: SM1234567890abcdef
Worker processing job: 1
User resolved: usr_abc123
Conversation resolved: conv_xyz789
AI response generated: 234 tokens
Message sent: SM0987654321fedcba
```

---

## 🟢 PRIORITY 4: Monitor Railway Logs

### What to Watch For

#### ✅ Success Patterns

```
✅ Server started on port 3001
✅ Prisma Client connected
✅ Redis connected — read/write working
✅ Webhook received
✅ Message enqueued
✅ Worker processing
✅ AI response generated
✅ Message sent
```

#### ❌ Error Patterns to Fix Immediately

**Prisma Errors:**
```
❌ P1001: Can't reach database server
→ Fix: Check DATABASE_URL, wake Neon database

❌ P2002: Unique constraint failed
→ Normal: Duplicate message prevention working

❌ P3009: Prisma Migrate not applied
→ Fix: Run migration (see below)
```

**Redis Errors:**
```
❌ ECONNREFUSED: Connection refused
→ Fix: Check REDIS_URL format

❌ NOAUTH: Authentication required
→ Fix: Ensure password in REDIS_URL
```

**Twilio Signature Errors:**
```
❌ Invalid Twilio signature
→ Fix: Verify WEBHOOK_BASE_URL matches Railway URL exactly
→ Check: TWILIO_AUTH_TOKEN is correct
```

**OpenAI Errors:**
```
❌ 401: Invalid API key
→ Fix: Check OPENAI_API_KEY

❌ 429: Rate limit exceeded
→ Normal: Retry logic handles this
```

---

## 🗄️ Database Migration

### Run Migration via Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# Run migration
railway run npx prisma migrate deploy

# Verify schema
railway run npx prisma studio
```

### Or via Railway Web Terminal

```
1. Go to your service
2. Click "..." menu → Shell
3. Run: npx prisma migrate deploy
```

### Expected Output

```
Applying migration `20240101000000_init`
Applying migration `20240102000000_add_token_tracking`
✅ Database migrations applied successfully
```

---

## ⚠️ Common Deployment Issues & Solutions

### Issue 1: Build Fails

**Symptoms:**
```
❌ npm run build failed
```

**Solutions:**
1. Check Railway logs for specific error
2. Verify package.json scripts are correct
3. Ensure all dependencies in package.json
4. Check TypeScript compilation errors

**Your code:** Already builds successfully ✅

---

### Issue 2: Server Crashes on Startup

**Symptoms:**
```
❌ Error: Cannot find module
❌ Process exited with code 1
```

**Solutions:**
1. Check all imports use .js extensions (ESM)
2. Verify Prisma client generated: `npx prisma generate`
3. Check environment variables required at startup

**Your code:** Already has correct imports ✅

---

### Issue 3: Webhook Returns 500

**Symptoms:**
```
❌ Twilio webhook fails
❌ Internal server error
```

**Solutions:**
1. Check Railway logs for actual error
2. Verify Twilio signature validation
3. Check WEBHOOK_BASE_URL matches exactly
4. Ensure webhook responds within 15 seconds

**Your code:** Already has timeout handling ✅

---

### Issue 4: Database Connection Timeout

**Symptoms:**
```
❌ P1001: Can't reach database server
```

**Solutions:**
1. Wake Neon database (send query via Prisma Studio)
2. Verify DATABASE_URL connection string
3. Check Neon dashboard for database status
4. Try DIRECT_URL instead

---

### Issue 5: No AI Response

**Symptoms:**
```
✅ Message received
✅ Enqueued
❌ No response sent
```

**Solutions:**
1. Check OpenAI API key is valid
2. Verify token cap not exceeded
3. Check Railway logs for AI errors
4. Test OpenAI API manually

---

## 📊 Post-Activation Verification Checklist

### Infrastructure Health

- [ ] Railway deployment successful
- [ ] No restart loops
- [ ] Logs show clean startup
- [ ] Health endpoint returns 200

### Service Connectivity

- [ ] Database: Prisma connected
- [ ] Redis: BullMQ worker running
- [ ] OpenAI: API key valid
- [ ] Twilio: Signature validation working

### End-to-End Flow

- [ ] WhatsApp message received
- [ ] Webhook signature validated
- [ ] Message enqueued
- [ ] Worker processes job
- [ ] AI generates response
- [ ] Response sent to user
- [ ] User receives reply

### Performance Metrics

- [ ] Webhook response time < 3 seconds
- [ ] AI generation time < 5 seconds
- [ ] Total pipeline time < 10 seconds
- [ ] Queue processing rate acceptable

---

## 🎯 Success Criteria

### Minimum Viable Activation

✅ Railway URL is live  
✅ Health endpoint returns 200  
✅ Test WhatsApp message gets AI response  
✅ No critical errors in logs  

### Full Production Readiness

✅ All services connected  
✅ Database migration applied  
✅ Token tracking functional  
✅ Human handoff working  
✅ Error handling verified  
✅ Performance acceptable  

---

## 🚀 Next Phase: Production Hardening

**After activation, we move to:**

1. **Load Testing**
   - Simulate concurrent users
   - Test queue capacity
   - Measure response times

2. **Webhook Optimization**
   - Response time tuning
   - Queue configuration
   - Worker scaling

3. **Scaling Strategy**
   - Horizontal scaling plan
   - Database connection pooling
   - Redis cluster setup

4. **Production Monitoring**
   - Set up alerts
   - Error tracking (Sentry)
   - Performance monitoring
   - Usage analytics

---

## 📞 Activation Support

### Documentation References

- **DEPLOY_NOW.md** - Quick deployment steps
- **BACKEND_ARCHITECTURE.md** - System architecture
- **CREDENTIALS_SETUP.md** - Credential management
- **SETUP_STATUS.md** - Current progress

### Railway Resources

- Dashboard: https://railway.app/dashboard
- Docs: https://docs.railway.app
- Status: https://railway.statuspage.io

### Service Consoles

- Neon: https://console.neon.tech
- Twilio: https://console.twilio.com
- OpenAI: https://platform.openai.com
- Redis: https://console.redislabs.com

---

## 🎉 Activation Complete

**When you see:**

```
✅ Health check: 200 OK
✅ WhatsApp test: AI responded
✅ Logs: Clean, no errors
```

**Reply with your Railway URL.**

**We then move to:**
- Load testing
- Performance optimization
- Scaling configuration
- Production monitoring setup

---

**You are no longer building.**  
**You are activating infrastructure.**  
**Let's go live.** 🚀

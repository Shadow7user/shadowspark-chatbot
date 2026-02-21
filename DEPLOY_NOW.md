# 🚀 Deploy to Railway NOW - Quick Guide

**Estimated Time:** 30 minutes  
**Current Status:** Code ready, not deployed

---

## ⚡ Quick Deployment Steps

### Step 1: Get Missing Info (10 min)

#### A. Neon Database Endpoint
1. Go to https://console.neon.tech
2. Open your project
3. Dashboard → Connection Details
4. Copy the connection string
5. Look for: `ep-xxxxx.region.aws.neon.tech`

#### B. Twilio Account SID
1. Go to https://console.twilio.com
2. Dashboard shows "Account SID" (starts with AC)
3. Copy it

#### C. Twilio WhatsApp Number
1. Same Twilio console
2. Messaging → Senders → WhatsApp
3. Copy your number (e.g., +14155238886)

---

### Step 2: Deploy to Railway (15 min)

#### A. Sign up / Login
1. Go to https://railway.app
2. Sign in with GitHub

#### B. Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose: `Shadow7user/shadowspark-chatbot`
4. Select branch: `copilot/update-location-to-owerri`

#### C. Set Environment Variables
Click "Variables" and add ALL of these:

```env
# Database
DATABASE_URL=postgresql://neondb_owner:npg_lT8ob1iLjIzf@YOUR_NEON_ENDPOINT/shadowspark_chatbot?sslmode=require&pgbouncer=true
DIRECT_URL=postgresql://neondb_owner:npg_lT8ob1iLjIzf@YOUR_NEON_ENDPOINT/shadowspark_chatbot?sslmode=require

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# OpenAI
OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE

# Redis
REDIS_URL=redis://default:YOUR_REDIS_PASSWORD@redis-19270.c325.us-east-1-4.ec2.cloud.redislabs.com:19270

# Server Config
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Admin
ADMIN_SECRET=LQQKRboHv9OcdxoharWa8fcrnovdtAJd

# Webhook (leave blank, Railway will auto-fill)
WEBHOOK_BASE_URL=
```

**Important:** Railway will provide the WEBHOOK_BASE_URL after deployment. You'll update it later.

#### D. Deploy
1. Click "Deploy"
2. Wait for build (2-3 minutes)
3. Check logs for "Server started"

#### E. Get Your Railway URL
1. Go to "Settings" tab
2. Look for "Public Networking"
3. Click "Generate Domain"
4. Copy URL: `https://shadowspark-chatbot-production.up.railway.app`

#### F. Update WEBHOOK_BASE_URL
1. Go back to "Variables"
2. Set WEBHOOK_BASE_URL to your Railway URL
3. Redeploy (Railway auto-redeploys)

---

### Step 3: Run Database Migration (5 min)

Railway has a terminal feature, or use Railway CLI:

```bash
# Install Railway CLI (if not installed)
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# Run migration
railway run npx prisma migrate deploy
```

**OR** use Railway's web terminal:
1. Go to your service
2. Click "..." menu → Shell
3. Run: `npx prisma migrate deploy`

---

### Step 4: Configure Twilio Webhook (5 min)

1. Go to https://console.twilio.com
2. Messaging → Try it out → WhatsApp sandbox settings
3. Find "WHEN A MESSAGE COMES IN"
4. Set URL to:
   ```
   https://YOUR_RAILWAY_URL.railway.app/webhooks/whatsapp
   ```
5. Method: **POST**
6. Click Save

---

### Step 5: Test It! (5 min)

#### A. Test Health Endpoint
```bash
curl https://YOUR_RAILWAY_URL.railway.app/health
```

Expected:
```json
{"status":"ok","timestamp":"...","uptime":123,"provider":"twilio"}
```

#### B. Send WhatsApp Test Message

To your Twilio sandbox number:
```
join [your-sandbox-keyword]
Hello ShadowSpark!
```

#### C. Check Railway Logs
1. Go to Railway dashboard
2. Click on your service
3. View logs

Look for:
```
✅ Webhook received
✅ Message enqueued
✅ AI response generated
✅ Response sent
```

---

## 🎉 Success Checklist

- [ ] Railway project created
- [ ] All environment variables set
- [ ] Deployment successful
- [ ] Domain generated
- [ ] Database migration completed
- [ ] Twilio webhook configured
- [ ] Health endpoint returns 200
- [ ] Test WhatsApp message received
- [ ] AI responds correctly

---

## 🚨 Common Issues

### Issue: Build fails
**Solution:** Check Railway logs. Usually missing environment variable.

### Issue: "P1001: Can't reach database"
**Solution:** Check DATABASE_URL is correct. Make sure Neon database is not sleeping.

### Issue: "Invalid Twilio signature"
**Solution:** Make sure WEBHOOK_BASE_URL matches your Railway URL exactly.

### Issue: No AI response
**Solution:** Check OpenAI API key is valid. Check Railway logs for errors.

---

## 📞 Get Help

If stuck:
1. Check Railway logs (most errors show here)
2. Review CREDENTIALS_SETUP.md
3. Check BACKEND_ARCHITECTURE.md

---

**Ready?** Go to https://railway.app and start Step 2! 🚀

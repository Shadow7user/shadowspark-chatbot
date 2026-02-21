# 🔴 PRIORITY 1: Deploy to Railway - Quick Steps

**Timeline:** 20 minutes  
**Goal:** Get your chatbot live

---

## Before You Start

You need these credentials ready:
- ✅ OpenAI API key (you have this)
- ✅ Redis URL (you have this)
- ⚠️ Neon database endpoint (get from console.neon.tech)
- ⚠️ Twilio Account SID starting with "AC" (get from console.twilio.com)
- ⚠️ Twilio Auth Token (get from console.twilio.com)
- ⚠️ Twilio WhatsApp number (get from console.twilio.com)

---

## Step 1: Railway Account (2 min)

1. Go to **https://railway.app**
2. Click "Sign in with GitHub"
3. Authorize Railway

---

## Step 2: Create Project (2 min)

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Search: **Shadow7user/shadowspark-chatbot**
4. Select branch: **copilot/update-location-to-owerri**
5. Click **"Deploy"**

---

## Step 3: Set Environment Variables (10 min)

In Railway dashboard, click **"Variables"** and add:

### Required Variables:

```env
DATABASE_URL=postgresql://neondb_owner:[PASSWORD]@[YOUR_NEON_ENDPOINT]/shadowspark_chatbot?sslmode=require&pgbouncer=true
DIRECT_URL=postgresql://neondb_owner:[PASSWORD]@[YOUR_NEON_ENDPOINT]/shadowspark_chatbot?sslmode=require
TWILIO_ACCOUNT_SID=AC[your_account_sid]
TWILIO_AUTH_TOKEN=[your_auth_token]
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
OPENAI_API_KEY=[your_openai_key]
REDIS_URL=redis://default:[PASSWORD]@redis-19270.c325.us-east-1-4.ec2.cloud.redislabs.com:19270
NODE_ENV=production
LOG_LEVEL=info
ADMIN_SECRET=[min_16_characters]
```

**Leave blank for now (Railway fills automatically):**
```env
WEBHOOK_BASE_URL=
PORT=
```

---

## Step 4: Wait for Deployment (3 min)

Watch Railway logs for:
```
✅ npm install complete
✅ Prisma Client generated
✅ TypeScript compiled
✅ Server started on port XXXX
```

---

## Step 5: Generate Domain (1 min)

1. Go to **Settings** tab
2. Click **"Networking"** → **"Generate Domain"**
3. **Copy your URL:** `https://shadowspark-chatbot-production.up.railway.app`

---

## Step 6: Update WEBHOOK_BASE_URL (1 min)

1. Go back to **"Variables"**
2. Edit **WEBHOOK_BASE_URL**
3. Paste your Railway URL
4. Railway auto-redeploys

---

## Step 7: Run Database Migration (2 min)

In Railway web terminal (click **"..."** → **"Shell"**):

```bash
npx prisma migrate deploy
```

Or use Railway CLI:
```bash
railway run npx prisma migrate deploy
```

---

## ✅ Verification

Test your deployment:

```bash
curl https://YOUR_RAILWAY_URL.railway.app/health
```

**Expected response:**
```json
{"status":"ok","timestamp":"...","uptime":123,"provider":"twilio"}
```

**If you get this ✅ YOU'RE LIVE!**

---

## 🚨 If Something Fails

### Build fails?
- Check Railway logs for error
- Verify all environment variables are set

### Health check returns error?
- Check logs for Prisma/Redis connection errors
- Verify DATABASE_URL and REDIS_URL are correct

### Can't connect to database?
- Go to console.neon.tech
- Wake your database (send a query)
- Check endpoint URL is correct

---

## Next Steps (After Priority 1 Complete)

1. **Priority 2:** Test health endpoint ✅
2. **Priority 3:** Configure Twilio webhook
3. **Priority 4:** Send test WhatsApp message

**See:** INFRASTRUCTURE_ACTIVATION.md for complete guide

---

**🎯 Your Goal:** Get a Railway URL that returns `{"status":"ok"}` when you visit `/health`

**That's it. Then we configure Twilio.**

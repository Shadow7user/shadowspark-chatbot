# 🚀 Deploy in 20 Minutes - Quick Reference

```
┌─────────────────────────────────────────┐
│  YOUR MISSION: Get chatbot live now    │
└─────────────────────────────────────────┘
```

---

## ⚡ Prerequisites (Have These Ready)

```
✅ OpenAI key      (you have)
✅ Redis URL       (you have)
⚠️  Neon endpoint  (get from console.neon.tech)
⚠️  Twilio SID     (get from console.twilio.com - starts with AC)
⚠️  Twilio Token   (get from console.twilio.com)
⚠️  Twilio Number  (get from console.twilio.com)
```

---

## 📋 7 Steps to Live

### 1️⃣ Railway Account
```
→ railway.app
→ Sign in with GitHub
```

### 2️⃣ New Project
```
→ "New Project" → "Deploy from GitHub repo"
→ Select: Shadow7user/shadowspark-chatbot
→ Branch: copilot/update-location-to-owerri
→ Deploy
```

### 3️⃣ Environment Variables
```
Click "Variables" and paste:

DATABASE_URL=postgresql://neondb_owner:[PASS]@[ENDPOINT]/shadowspark_chatbot?sslmode=require&pgbouncer=true
TWILIO_ACCOUNT_SID=AC[your_sid]
TWILIO_AUTH_TOKEN=[your_token]
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
OPENAI_API_KEY=[your_key]
REDIS_URL=redis://default:[PASS]@redis-19270.c325.us-east-1-4.ec2.cloud.redislabs.com:19270
NODE_ENV=production
ADMIN_SECRET=[min_16_chars]
```

### 4️⃣ Wait for Build
```
Watch logs for:
✅ npm install
✅ Prisma generated
✅ Server started
```

### 5️⃣ Generate Domain
```
Settings → Networking → Generate Domain
Copy: https://your-app.up.railway.app
```

### 6️⃣ Update Webhook URL
```
Variables → WEBHOOK_BASE_URL → [paste Railway URL]
```

### 7️⃣ Migrate Database
```
Click "..." → Shell → Run:
npx prisma migrate deploy
```

---

## ✅ Test It Works

```bash
curl https://YOUR_RAILWAY_URL/health
```

**Expected:**
```json
{"status":"ok","timestamp":"...","uptime":123}
```

**✅ If you see this → YOU'RE LIVE!**

---

## 🎯 What You Get

```
Live chatbot on Railway ✅
Health endpoint working ✅
Database connected ✅
Redis connected ✅
Ready for Twilio webhook ✅
```

---

## 📞 Next: Configure Twilio

After this works, go to:
- console.twilio.com
- Set webhook: `https://YOUR_RAILWAY_URL/webhooks/whatsapp`
- Method: POST
- Test with WhatsApp message

---

**See:** PRIORITY_1_CHECKLIST.md for detailed steps

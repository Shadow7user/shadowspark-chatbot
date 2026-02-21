# Credentials Setup Guide

**Date:** February 21, 2026  
**Status:** ⚠️ Partial - Need Additional Information

---

## ✅ Credentials Received

The following credentials have been provided and added to `.env`:

### 1. OpenAI ✅
```
OPENAI_API_KEY=sk-proj-[REDACTED]
```

### 2. Twilio ⚠️ NEEDS VERIFICATION
```
TWILIO_AUTH_TOKEN=SK[REDACTED]
```
**Note:** This starts with "SK" which is typically an API Key format, not an Auth Token.

**What's Missing:**
- `TWILIO_ACCOUNT_SID` (should start with "AC")
- `TWILIO_WHATSAPP_NUMBER` (format: whatsapp:+1234567890)

### 3. Neon Database ⚠️ INCOMPLETE
```
PGUSER=neondb_owner
PGPASSWORD=[REDACTED]
```

**What's Missing:**
- Database endpoint URL (format: `ep-xxx-xxx.region.aws.neon.tech`)
- Database name (likely `shadowspark_chatbot`)

**Where to Find:**
1. Go to https://console.neon.tech
2. Select your project
3. Go to Dashboard
4. Look for "Connection Details"
5. Copy the full connection string

### 4. Redis ✅
```
REDIS_URL=redis://default:[PASSWORD]@redis-xxxxx.ec2.cloud.redislabs.com:19270
```

### 5. Admin Secret ✅
```
ADMIN_SECRET=[CONFIGURED]
```

---

## 🔧 How to Complete Setup

### Step 1: Get Twilio Information

Go to https://console.twilio.com and find:

1. **Account SID** (starts with "AC"):
   - Go to Console Dashboard
   - Look for "Account SID"
   - Copy the value

2. **Auth Token**:
   - Same page as Account SID
   - Click "Show" to reveal Auth Token
   - Copy the value

3. **WhatsApp Number**:
   - Go to Messaging > Try it out > Send a WhatsApp message
   - Or: Messaging > Senders > WhatsApp senders
   - Copy your WhatsApp number (format: +14155238886)

### Step 2: Get Neon Database Endpoint

Go to https://console.neon.tech and:

1. Open your project
2. Go to Dashboard
3. Find "Connection Details" or "Connection string"
4. Look for the host part: `ep-xxxxx.region.aws.neon.tech`
5. Copy the full connection string

**Expected format:**
```
postgresql://neondb_owner:[password]@ep-xxx-xxx.us-east-2.aws.neon.tech/shadowspark_chatbot?sslmode=require
```

### Step 3: Update .env File

Once you have the missing information, edit `.env`:

```bash
nano .env
```

Update these lines:
```env
# Replace ep-xxx.region.aws.neon.tech with your actual endpoint
DATABASE_URL="postgresql://neondb_owner:[PASSWORD]@YOUR_ACTUAL_ENDPOINT/shadowspark_chatbot?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://neondb_owner:[PASSWORD]@YOUR_ACTUAL_ENDPOINT/shadowspark_chatbot?sslmode=require"

# Replace with your actual Twilio credentials
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_actual_auth_token"
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"
```

---

## ✅ Test Connections

After completing the `.env` file:

```bash
# Test all service connections
npx tsx src/test-connection.ts
```

Expected output:
```
✅ PostgreSQL connected via Prisma
✅ Redis connected — read/write working
✅ OpenAI connected — GPT-4o-mini responding
```

---

## 🚀 Next Steps After Setup

1. **Run Database Migration:**
   ```bash
   npx prisma migrate deploy
   ```

2. **Start Development Server:**
   ```bash
   npm run dev
   ```

3. **Seed Demo Config:**
   ```bash
   curl -X GET http://localhost:3001/setup/seed-demo \
     -H "x-admin-secret: YOUR_ADMIN_SECRET"
   ```

4. **Test Health Endpoint:**
   ```bash
   curl http://localhost:3001/health
   ```

---

## 📞 Additional Credentials Provided (For Reference)

These were also in your message:
- Sentry Token: For error monitoring (optional)
- Redis API Key: For Redis management (not needed for connection)
- Additional token keys: For various integrations

---

## ⚠️ Current Status

- ✅ OpenAI: Ready
- ✅ Redis: Ready (configured, needs network test)
- ✅ Admin Secret: Ready
- ⚠️ Twilio: Need Account SID and WhatsApp Number
- ⚠️ Neon Database: Need endpoint URL

**Action Required:** Get Twilio Account SID and Neon database endpoint to proceed.

---

## 🔒 Security Notes

- `.env` file is gitignored and NOT committed
- All credentials remain local
- Never commit `.env` to version control
- Use environment variables in production (Railway)

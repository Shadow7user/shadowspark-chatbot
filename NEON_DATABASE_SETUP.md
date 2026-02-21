# Neon Database Setup - Complete Guide

## Current Status

### ✅ What You Have

```bash
PGUSER=neondb_owner
PGPASSWORD=npg_lT8ob1iLjIzf
```

### ❌ What You Need

**Neon Database Host/Endpoint**

Example: `ep-cool-forest-123456.us-east-2.aws.neon.tech`

---

## Step 1: Get Your Neon Endpoint (5 minutes)

### Option A: From Neon Console (Recommended)

1. **Go to Neon Console**
   ```
   https://console.neon.tech
   ```

2. **Sign in** with your account

3. **Select your project**
   - Look for your database project in the dashboard
   - Click on it

4. **Navigate to Connection Details**
   - Click on "Connection Details" or "Connect"
   - You'll see a connection string

5. **Copy the connection string**
   
   It looks like:
   ```
   postgresql://neondb_owner:npg_lT8ob1iLjIzf@ep-cool-forest-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

6. **Extract the host**
   
   The host is the part after `@` and before `/`:
   ```
   ep-cool-forest-123456.us-east-2.aws.neon.tech
   ```

### Option B: From Neon Email

Check your email for:
- "Welcome to Neon" email
- "Database created" notification
- Contains connection details

### Option C: From Neon CLI

If you have Neon CLI installed:

```bash
neonctl connection-string
```

---

## Step 2: Construct Your DATABASE_URL

### Format

```
postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

### Fill in Your Values

```
postgresql://neondb_owner:npg_lT8ob1iLjIzf@<YOUR_NEON_HOST>/neondb?sslmode=require
```

### Example (Replace with YOUR host)

```bash
# EXAMPLE - Replace ep-cool-forest-123456.us-east-2.aws.neon.tech with YOUR endpoint
DATABASE_URL="postgresql://neondb_owner:npg_lT8ob1iLjIzf@ep-cool-forest-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

### Important Notes

✅ **Include**:
- `?sslmode=require` at the end (Neon requires SSL)
- Entire URL in quotes when setting in environment

❌ **Don't**:
- Remove the password special characters
- Forget the `?sslmode=require` parameter
- Use http:// or other protocols

---

## Step 3: Add to Railway

### Via Railway Dashboard

1. **Open Railway Dashboard**
   ```
   https://railway.app
   ```

2. **Navigate to your project**
   - Find: ShadowSpark Chatbot (or your project name)

3. **Click on your service**
   - Should see your deployed application

4. **Go to Variables tab**
   - Click "Variables" in the left sidebar

5. **Add DATABASE_URL**
   - Click "+ New Variable"
   - Variable: `DATABASE_URL`
   - Value: Your constructed URL (from Step 2)
   - Click "Add"

6. **Railway auto-redeploys**
   - Watch the deployment logs
   - Should take 2-3 minutes

### Via Railway CLI

If you prefer CLI:

```bash
# Set the DATABASE_URL
railway variables --set DATABASE_URL="postgresql://neondb_owner:npg_lT8ob1iLjIzf@YOUR_NEON_HOST/neondb?sslmode=require"

# Trigger redeploy
railway up
```

---

## Step 4: Run Database Migration

After Railway redeploys with the DATABASE_URL:

### Option A: Via Railway CLI

```bash
# Connect to Railway environment
railway link

# Run migration
railway run npx prisma migrate deploy
```

### Option B: Add to Procfile

Already configured! The Procfile includes:

```
release: npx prisma migrate deploy
web: node dist/server.js
```

Railway will automatically run migrations before starting the web service.

### Option C: Manual Connection

If you need to run locally:

```bash
# Set DATABASE_URL locally
export DATABASE_URL="postgresql://neondb_owner:npg_lT8ob1iLjIzf@YOUR_NEON_HOST/neondb?sslmode=require"

# Run migration
npx prisma migrate deploy

# Verify
npx prisma db pull
```

---

## Step 5: Verify Database Connection

### Check Railway Logs

1. Railway dashboard → Your service
2. Click "Deployments"
3. Click latest deployment
4. View logs

**Look for**:
```
✅ Prisma migration successful
✅ Database connection established
✅ Server starting on port...
```

**Avoid**:
```
❌ P1001: Can't reach database server
❌ Connection refused
❌ SSL required
```

### Test Connection Manually

```bash
# Via Railway CLI
railway run npx prisma db pull

# Expected output:
# Prisma schema loaded from prisma/schema.prisma
# Datasource "db": PostgreSQL database "neondb"
# ✔ Introspected 11 models
```

### Query Test

```bash
railway run npx prisma studio
```

Opens Prisma Studio to browse your database.

---

## Common Issues & Solutions

### Issue 1: "P1001: Can't reach database server"

**Cause**: Wrong host or database is sleeping (Neon free tier)

**Solution**:
1. Check host is correct
2. Wake up Neon database:
   - Go to Neon console
   - Click your project
   - Database auto-wakes on connection attempt

### Issue 2: "SSL connection required"

**Cause**: Missing `?sslmode=require`

**Solution**:
```bash
# Add to your DATABASE_URL:
?sslmode=require
```

### Issue 3: "Password authentication failed"

**Cause**: Wrong password or special characters

**Solution**:
```bash
# URL encode special characters if needed
# Or copy-paste exact password from Neon console
```

### Issue 4: "Database does not exist"

**Cause**: Wrong database name in URL

**Solution**:
```bash
# Ensure database name is correct (usually "neondb")
postgresql://...@.../neondb?sslmode=require
                    ^^^^^^
```

---

## Database Schema

After migration, you'll have these tables:

### Core Tables (11 models)

1. **ChatUser** - WhatsApp users
2. **UserChannel** - Channel connections
3. **Conversation** - Chat sessions
4. **Message** - All messages
5. **WebhookLog** - Twilio webhook logs
6. **ClientConfig** - Token tracking config
7. **Business** - Business profiles
8. **Lead** - Lead management
9. **auth_attempts** - Security logs
10. **contact_submissions** - Contact forms
11. **stats** - Analytics
12. **subscribers** - Newsletter subscribers

### Token Tracking Fields

In `ClientConfig`:
- `monthlyTokenUsage` - Current month usage
- `monthlyTokenCap` - Usage limit
- `lastResetMonth` - Auto-reset tracker

---

## Next Steps After Database Setup

Once database is connected:

### 1️⃣ Seed Demo Data (Optional)

```bash
railway run npx prisma db seed
```

### 2️⃣ Configure Twilio Webhook

1. Get your Railway URL:
   ```
   https://your-app.railway.app
   ```

2. Go to Twilio Console:
   ```
   https://console.twilio.com
   ```

3. Navigate to WhatsApp → Sandbox

4. Set webhook URL:
   ```
   https://your-app.railway.app/webhooks/whatsapp
   ```

5. Method: POST

### 3️⃣ Test End-to-End

Send a WhatsApp message to your Twilio sandbox number:

```
Hello ShadowSpark!
```

Check Railway logs for:
```
✅ Webhook received
✅ Message queued
✅ AI processing
✅ Response sent
```

---

## Environment Variables Checklist

After adding DATABASE_URL, your Railway should have:

```bash
# ✅ Must Have
NODE_ENV=production
DATABASE_URL=postgresql://neondb_owner:npg_lT8ob1iLjIzf@YOUR_HOST/neondb?sslmode=require
OPENAI_API_KEY=sk-proj-...
REDIS_URL=redis://default:FLegCcc1HB19oEiwKLmTcL5FiGn6HCjf@redis-19270.c325.us-east-1-4.ec2.cloud.redislabs.com:19270
ADMIN_SECRET=<your-16+-char-secret>

# ⏳ Need Later
TWILIO_ACCOUNT_SID=AC... (starts with AC, not SK)
TWILIO_AUTH_TOKEN=<from-twilio-console>
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
WEBHOOK_BASE_URL=https://your-app.railway.app
```

---

## Quick Reference

### Get Neon Endpoint
```
https://console.neon.tech → Project → Connection Details
```

### Construct DATABASE_URL
```
postgresql://neondb_owner:npg_lT8ob1iLjIzf@<NEON_HOST>/neondb?sslmode=require
```

### Add to Railway
```
Dashboard → Project → Variables → Add DATABASE_URL
```

### Run Migration
```bash
railway run npx prisma migrate deploy
```

### Verify
```bash
railway logs
```

---

## Support

If you get stuck:

1. **Check Neon Status**: https://neon.tech/status
2. **Check Railway Status**: https://railway.app/status  
3. **Review Logs**: `railway logs`
4. **Prisma Docs**: https://www.prisma.io/docs

---

## Summary

📝 **What you need to do:**

1. Get Neon endpoint from console.neon.tech
2. Construct DATABASE_URL with your endpoint
3. Add DATABASE_URL to Railway variables
4. Wait for auto-redeploy (2-3 min)
5. Check logs for successful migration

**Time**: ~10 minutes

**Result**: Fully operational database + Redis + Application

🎉 **You're almost there!**

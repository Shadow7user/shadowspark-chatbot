# Complete Setup Guide - ShadowSpark WhatsApp Chatbot

This guide will walk you through setting up the ShadowSpark WhatsApp chatbot from scratch using Twilio.

## Overview

The ShadowSpark chatbot uses **Twilio's WhatsApp API** (not Meta's WhatsApp Cloud API directly) to send and receive messages. This simplifies setup since you don't need to deal with Meta's Business verification process for basic functionality.

## Prerequisites

Before starting, make sure you have:
- Node.js 20 or higher installed
- A GitHub account (for version control)
- A Railway account (for deployment) - [Sign up here](https://railway.app)
- A credit card for paid services (Twilio, OpenAI)

## Part 1: Service Setup

### 1.1 Database Setup (Neon PostgreSQL)

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project or use existing one
3. Create database: `shadowspark_chatbot`
4. Copy both connection strings:
   - **Pooled connection** (with pgbouncer) → `DATABASE_URL`
   - **Direct connection** (without pgbouncer) → `DIRECT_URL`

### 1.2 Redis Setup (Upstash)

1. Go to [Upstash Console](https://console.upstash.com)
2. Create a new Redis database
3. Choose the free tier
4. Copy the `REDIS_URL` (starts with `redis://...` or `rediss://...`)

### 1.3 OpenAI Setup

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (starts with `sk-...`)
4. Set up billing if you haven't already

### 1.4 Twilio WhatsApp Setup

**Option A: WhatsApp Sandbox (Development/Testing)**

1. Go to [Twilio Console](https://console.twilio.com)
2. Create account or sign in
3. Navigate to **Messaging** → **Try it out** → **Send a WhatsApp message**
4. Follow instructions to join your WhatsApp sandbox
5. Copy these values:
   - Account SID (starts with `AC...`)
   - Auth Token (from Account Info)
   - WhatsApp Sandbox Number (e.g., `whatsapp:+14155238886`)

**Option B: WhatsApp Business API (Production)**

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Messaging** → **Services** → **WhatsApp**
3. Click **Request Access**
4. Complete business verification process (can take 1-5 business days)
5. After approval:
   - Purchase a phone number
   - Enable WhatsApp on that number
   - Copy Account SID, Auth Token, and your WhatsApp number

> **Note:** Production WhatsApp requires business profile setup and may require message templates for certain use cases. The sandbox is sufficient for development.

## Part 2: Local Development Setup

### 2.1 Clone and Install

```bash
# Clone the repository
git clone https://github.com/Shadow7user/shadowspark-chatbot.git
cd shadowspark-chatbot

# Install dependencies
npm install
```

### 2.2 Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` and fill in all values:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/shadowspark_chatbot?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/shadowspark_chatbot?sslmode=require"

# Twilio WhatsApp
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your-auth-token-here"
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"

# OpenAI
OPENAI_API_KEY="sk-..."

# Redis (Upstash)
REDIS_URL="redis://default:xxx@xxx.upstash.io:6379"

# Server Configuration
PORT=3001
NODE_ENV=development
LOG_LEVEL=info

# Webhook (use ngrok for local testing)
WEBHOOK_BASE_URL="https://your-ngrok-url.ngrok.io"

# Admin Secret (optional for development, required for production)
# ADMIN_SECRET="your-secret-at-least-16-chars"
```

### 2.2.1 Validate Your Setup

After configuring your `.env` file, validate your setup:

```bash
npm run setup:validate
```

This script will:
- ✅ Check environment variable format and values
- ✅ Test database connectivity
- ✅ Test Redis connectivity
- ✅ Validate Twilio credentials
- ✅ Verify OpenAI API key
- ✅ Check production requirements (if `NODE_ENV=production`)

Fix any errors before proceeding to the next step.

### 2.3 Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Optional: View your database
npx prisma studio
```

### 2.4 Seed Demo Configuration

Start the server first:

```bash
npm run dev
```

Then in another terminal, seed demo config:

```bash
# This creates a demo client configuration
curl http://localhost:3001/setup/seed-demo
```

Or open in browser: http://localhost:3001/setup/seed-demo

### 2.5 Setup Webhook (Local Testing)

For local development, use [ngrok](https://ngrok.com) to expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Start ngrok
ngrok http 3001
```

Copy the ngrok URL (e.g., `https://abc123.ngrok.io`) and:

1. Update `WEBHOOK_BASE_URL` in your `.env` file
2. Restart your dev server: `npm run dev`
3. Configure in Twilio Console:
   - Go to **Messaging** → **Settings** → **WhatsApp Sandbox Settings**
   - Set **"When a message comes in"** to: `https://abc123.ngrok.io/webhooks/whatsapp`
   - Click **Save**

### 2.6 Test the Bot

1. Send a WhatsApp message to your Twilio sandbox number
2. Check your terminal logs to see the message being processed
3. You should receive an AI-generated response

## Part 3: Production Deployment (Railway)

### 3.1 Install Railway CLI

```bash
npm install -g @railway/cli
```

### 3.2 Login and Initialize

```bash
# Login to Railway
railway login

# Link to existing project or create new one
railway init
```

### 3.3 Set Environment Variables

Set all required environment variables in Railway:

```bash
# Database
railway variables set DATABASE_URL="your-neon-pooled-url"
railway variables set DIRECT_URL="your-neon-direct-url"

# Twilio
railway variables set TWILIO_ACCOUNT_SID="ACxxx..."
railway variables set TWILIO_AUTH_TOKEN="your-token"
railway variables set TWILIO_WHATSAPP_NUMBER="whatsapp:+1234567890"

# OpenAI
railway variables set OPENAI_API_KEY="sk-..."

# Redis
railway variables set REDIS_URL="redis://..."

# Server
railway variables set NODE_ENV="production"
railway variables set PORT="3001"
railway variables set LOG_LEVEL="info"

# Admin Secret (REQUIRED for production)
railway variables set ADMIN_SECRET="your-secure-secret-min-16-chars"

# Webhook (set after deployment)
# railway variables set WEBHOOK_BASE_URL="https://your-app.up.railway.app"
```

### 3.4 Deploy

```bash
# Deploy to Railway
git push origin main
```

Or use Railway CLI:

```bash
railway up
```

### 3.5 Configure Webhook in Twilio

After deployment:

1. Copy your Railway URL from the Railway dashboard (e.g., `https://shadowspark-chatbot-production.up.railway.app`)
2. Set the `WEBHOOK_BASE_URL` environment variable:
   ```bash
   railway variables set WEBHOOK_BASE_URL="https://your-app.up.railway.app"
   ```
3. Go to [Twilio Console](https://console.twilio.com)
4. Navigate to **Messaging** → **Settings** → **WhatsApp Sandbox Settings** (or your WhatsApp number settings)
5. Set **"When a message comes in"** to: `https://your-app.up.railway.app/webhooks/whatsapp`
6. Set **Method** to: `POST`
7. Click **Save**

### 3.6 Verify Deployment

Test your production bot:

```bash
# Check health endpoint
curl https://your-app.up.railway.app/health

# Send a WhatsApp message to your number
# Check Railway logs for processing
railway logs
```

## Part 4: WhatsApp Business Profile Setup (Optional)

If you're using WhatsApp Business API (not sandbox), you'll need to set up your business profile:

### 4.1 Business Profile Configuration

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Messaging** → **Senders** → **WhatsApp senders**
3. Click on your WhatsApp number
4. Configure business profile:
   - **Business Name**: Your business name
   - **Business Description**: What your business does
   - **Business Address**: Physical address
   - **Business Email**: Contact email
   - **Business Website**: Your website
   - **Logo**: Upload a square logo (at least 192x192px)

### 4.2 Meta Business Verification

For production WhatsApp numbers, Meta may require business verification:

1. Twilio will guide you through the Meta Business verification process
2. This typically requires:
   - Business registration documents
   - Proof of business address
   - Identity verification of business owner
3. Verification can take 1-5 business days

### 4.3 Message Templates (If Needed)

For proactive messages (messages sent outside a 24-hour customer service window), you need approved message templates:

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Messaging** → **Content Template Builder**
3. Create templates for common scenarios:
   - Welcome messages
   - Appointment reminders
   - Order confirmations
   - etc.

4. Submit templates for Meta approval (usually approved within 24 hours)

> **Note:** This chatbot currently operates in reactive mode (responds to incoming messages), so templates are not required for basic functionality.

## Part 5: Post-Deployment Checklist

After everything is set up, verify:

- [ ] Health endpoint responds: `https://your-app.up.railway.app/health`
- [ ] WhatsApp messages are received and processed
- [ ] AI responses are sent successfully
- [ ] Database is connected (check Railway logs)
- [ ] Redis is connected (check Railway logs)
- [ ] Environment variables are all set correctly
- [ ] Admin secret is set (for production)
- [ ] Twilio webhook signature validation is working
- [ ] OpenAI API is responding

## Troubleshooting

### Messages not being received

1. Check Twilio webhook configuration
2. Verify `WEBHOOK_BASE_URL` is set correctly
3. Check Railway logs for errors
4. Verify Twilio signature validation (may be failing in production)

### AI not responding

1. Check OpenAI API key is valid
2. Check OpenAI account has credits
3. Look for token limit errors in logs
4. Verify database connection

### Database connection errors

1. Check `DATABASE_URL` and `DIRECT_URL` are correct
2. Verify Neon database is not paused (free tier pauses after inactivity)
3. Check IP allowlist in Neon (should allow all IPs)

### Redis connection errors

1. Verify `REDIS_URL` is correct
2. Check Upstash dashboard for connection issues
3. Verify Redis database is not paused

## Support

For issues or questions:
- Check Railway logs: `railway logs`
- Check Twilio console for webhook errors
- Review the [README.md](README.md) for architecture details
- Open an issue on GitHub

## Next Steps

Once your bot is running:
- Configure client-specific settings via `/setup/seed-demo`
- Customize AI prompts and responses in the database
- Set up monitoring and alerts
- Configure rate limits per client
- Set up token usage caps
- Implement human handoff workflows

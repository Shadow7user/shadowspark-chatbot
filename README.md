# ShadowSpark AI Chatbot

WhatsApp auto-responder powered by GPT-4o-mini. Receives messages via WhatsApp Cloud API, processes with AI, responds automatically.

**ShadowSpark Technologies** - AI Automation Solutions  
Location: Owerri, Imo State, Nigeria

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in all values (see below)

# 3. Generate Prisma client + push schema
npx prisma generate
npx prisma db push

# 4. Seed demo config
# After starting: GET http://localhost:3001/setup/seed-demo

# 5. Run development server
npm run dev
```

## Required Accounts

### WhatsApp Cloud API
1. Go to https://developers.facebook.com
2. Create a Meta App → select "Business" type
3. Add WhatsApp product
4. Get: Phone Number ID, Access Token from WhatsApp > API Setup
5. Set your Verify Token (any string you choose)

### OpenAI
1. https://platform.openai.com/api-keys
2. Create API key (use Raenest virtual card for billing)

### Redis (Upstash - free tier)
1. https://console.upstash.com
2. Create Redis database
3. Copy REDIS_URL

### Database (Neon)
- Create a new database `shadowspark_chatbot` in your existing Neon project
- Or use a separate schema in the existing database

## Deployment (Railway)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and init
railway login
railway init

# Set environment variables
railway variables set WHATSAPP_VERIFY_TOKEN=xxx ...

# Deploy
railway up
```

After deploy:
1. Copy your Railway URL (e.g. `https://xxx.railway.app`)
2. Go to Meta App > WhatsApp > Configuration
3. Set webhook URL: `https://xxx.railway.app/webhooks/whatsapp`
4. Set verify token: same as WHATSAPP_VERIFY_TOKEN
5. Subscribe to "messages" field

## Architecture

```
WhatsApp → POST /webhooks/whatsapp → BullMQ Queue → MessageRouter
                                                        ↓
                                              ConversationManager
                                                        ↓
                                                    AIBrain (GPT-4o-mini)
                                                        ↓
                                              WhatsAppAdapter.sendMessage()
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /webhooks/whatsapp | Meta webhook verification |
| POST | /webhooks/whatsapp | Incoming messages |
| GET | /setup/seed-demo | Create demo client config |

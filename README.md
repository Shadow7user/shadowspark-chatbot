# ShadowSpark AI Chatbot

WhatsApp auto-responder powered by GPT-4o-mini. Receives messages via **Twilio WhatsApp API**, processes with AI, responds automatically.

## Documentation

- **[QUICK_START.md](QUICK_START.md)** - Fast setup after cloning (credentials, deployment, Twilio setup)
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Complete setup guide with detailed instructions
- **[README.md](README.md)** - This file (architecture and overview)

## Quick Setup

For complete setup instructions, see **[QUICK_START.md](QUICK_START.md)** which covers:
1. Filling in `.env` with real credentials
2. Message templates (optional - not needed for basic functionality)
3. Deploying to Railway with `git push origin main`
4. Setting up Twilio Console (webhook configuration and business profile)

### Quick Start (Development)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in all values (see SETUP_GUIDE.md for details)

# 3. Generate Prisma client + push schema
npx prisma generate
npx prisma db push

# 4. Seed demo config
# After starting: GET http://localhost:3001/setup/seed-demo

# 5. Run development server
npm run dev
```

## Required Services

### Twilio (WhatsApp Integration)
- **Sandbox**: Quick setup for development/testing
- **Business API**: Production-ready with business verification
- Get credentials from [Twilio Console](https://console.twilio.com)

### OpenAI
- API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- GPT-4o-mini model (default)

### Redis (Upstash - free tier)
- Message queue with BullMQ
- Get from [Upstash Console](https://console.upstash.com)

### Database (Neon PostgreSQL)
- Conversation history and client configs
- Get from [Neon Console](https://console.neon.tech)

## Deployment (Railway)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and init
railway login
railway init

# Set environment variables (see SETUP_GUIDE.md for full list)
railway variables set TWILIO_ACCOUNT_SID="ACxxx..."
railway variables set TWILIO_AUTH_TOKEN="xxx"
railway variables set OPENAI_API_KEY="sk-..."
# ... set all other variables

# Deploy
git push origin main
```

After deployment:
1. Copy your Railway URL (e.g. `https://xxx.railway.app`)
2. Set `WEBHOOK_BASE_URL` in Railway: `railway variables set WEBHOOK_BASE_URL="https://xxx.railway.app"`
3. Go to [Twilio Console](https://console.twilio.com) → Messaging → WhatsApp Settings
4. Set webhook URL: `https://xxx.railway.app/webhooks/whatsapp`
5. Save and test by sending a WhatsApp message

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

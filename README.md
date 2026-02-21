# ShadowSpark AI Chatbot

WhatsApp auto-responder powered by GPT-4o-mini with intelligent intent classification, priority routing, cost management, and admin escalation queues.

## ✨ Enhanced Features

- **🎯 Intent Classification**: Automatically categorizes messages (Support, Sales, Complaint, FAQ, Escalation, Feedback)
- **⚡ Priority Routing**: Smart message prioritization based on intent, VIP status, and conversation history
- **💰 Cost Guards**: Pre-emptive cost control with daily and monthly limits
- **🚨 Admin Escalation Queue**: Priority-based queue for human intervention with dedicated API endpoints
- **📊 Analytics Logging**: Comprehensive conversation analytics and insights

For detailed documentation on these features, see [ENHANCED_FEATURES.md](./ENHANCED_FEATURES.md).

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
| **Admin Escalation Queue** | | |
| GET | /admin/escalations | Get pending escalations (requires x-admin-secret) |
| GET | /admin/escalations/stats | Get escalation statistics (requires x-admin-secret) |
| POST | /admin/escalations/:id/assign | Assign escalation to admin (requires x-admin-secret) |
| POST | /admin/escalations/:id/progress | Mark escalation in progress (requires x-admin-secret) |
| POST | /admin/escalations/:id/resolve | Resolve escalation (requires x-admin-secret) |
| **Analytics** | | |
| GET | /analytics/client/:clientId | Get client analytics summary (requires x-admin-secret) |
| GET | /analytics/intents/:clientId | Get top intents for client (requires x-admin-secret) |
| GET | /analytics/dashboard | Get overall analytics dashboard (requires x-admin-secret) |

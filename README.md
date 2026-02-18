# ShadowSpark AI Chatbot

AI-powered WhatsApp and web chatbot with two implementation options:

1. **TypeScript Server** (recommended) - Production-ready with PostgreSQL, Redis, analytics
2. **Claude Server** - Simpler Express-based server with Claude AI

## Quick Start

### Option 1: TypeScript Server (Full-Featured)

WhatsApp chatbot powered by GPT-4o-mini with database persistence and advanced features.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in: DATABASE_URL, TWILIO_*, OPENAI_API_KEY, REDIS_URL

# 3. Generate Prisma client + push schema
npx prisma generate
npx prisma db push

# 4. Run development server
npm run dev
```

Server starts on port 3001. See full setup guide in sections below.

### Option 2: Claude Server (Simpler)

Lightweight Express server with Claude AI and in-memory conversation storage.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in: TWILIO_*, ANTHROPIC_API_KEY

# 3. Run development server
npm run dev:claude
```

Server starts on port 3000. See [CLAUDE_SERVER.md](CLAUDE_SERVER.md) for details.

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

## Server Implementations

This repository includes two server implementations:

### TypeScript Server (`src/server.ts`)
- **AI Engine**: OpenAI (GPT-4o-mini)
- **Framework**: Fastify
- **Storage**: PostgreSQL + Redis
- **Features**: Database persistence, async queues, analytics, token tracking
- **Run**: `npm run dev` or `npm start`
- **Port**: 3001 (default)

**Best for**: Production deployments, multi-client setups, advanced features

### Claude Server (`server.js`)
- **AI Engine**: Anthropic Claude (Sonnet 4)
- **Framework**: Express  
- **Storage**: In-memory (Map)
- **Features**: Simple conversation history, easy deployment
- **Run**: `npm run dev:claude` or `npm run start:claude`
- **Port**: 3000 (default)

**Best for**: Quick prototypes, single-client deployments, Claude AI preference

See [CLAUDE_SERVER.md](CLAUDE_SERVER.md) for detailed Claude server documentation.


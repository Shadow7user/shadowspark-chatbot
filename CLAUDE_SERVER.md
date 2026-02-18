# Claude AI Server

This directory contains an alternative Express-based server implementation that uses Claude AI (Anthropic) instead of OpenAI.

## Overview

The repository now supports **two server implementations**:

1. **TypeScript/Fastify Server** (`src/server.ts`) - Production-grade with database, queues, and OpenAI
2. **Express/Claude Server** (`server.js`) - Simpler implementation with Claude AI and in-memory storage

## Why Two Implementations?

- **TypeScript Server**: Full-featured, production-ready with PostgreSQL, Redis, analytics, and advanced routing
- **Claude Server**: Lightweight, easy to deploy, uses Claude AI with in-memory conversation history

## Quick Start - Claude Server

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Add to your `.env` file:

```bash
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your-auth-token"
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"
ANTHROPIC_API_KEY="sk-ant-..."
PORT=3000
```

Get your Anthropic API key from: https://console.anthropic.com

### 3. Run the Server

```bash
# Development
npm run dev:claude

# Production
npm run start:claude
```

The server will start on port 3000 (or your configured PORT).

## Features

### Claude AI Integration
- Uses Claude Sonnet 4 model for intelligent conversations
- Multi-turn conversation support with context preservation
- Personalized responses using customer's WhatsApp name

### Conversation Management
- In-memory conversation history (20 messages per user)
- 24-hour automatic cleanup
- Session-based for both WhatsApp and web chat

### Endpoints

- `GET /` - Server status and info
- `GET /health` - Health check
- `POST /webhooks/whatsapp` - WhatsApp message webhook
- `POST /webhooks/whatsapp/status` - Status callbacks from Twilio
- `POST /api/chat` - Website chatbot API (CORS enabled for shadowspark-tech.org)

## WhatsApp Integration

### Configure Twilio Webhook

1. Go to your Twilio Console → WhatsApp → Sandbox Settings
2. Set webhook URL: `https://your-domain.com/webhooks/whatsapp`
3. Method: POST
4. Status callback: `https://your-domain.com/webhooks/whatsapp/status`

### Message Features

- **Text Messages**: Full AI-powered responses
- **Media Messages**: Acknowledged with intelligent response
- **Long Messages**: Automatically split at paragraph boundaries (1500 char limit)

## Website Chat API

The `/api/chat` endpoint allows your website to use the same AI:

### Request

```javascript
POST /api/chat
Content-Type: application/json

{
  "message": "Hello, I'm interested in your AI chatbot services",
  "sessionId": "optional-session-id"  // for conversation continuity
}
```

### Response

```javascript
{
  "reply": "Hello! I'm glad you're interested...",
  "sessionId": "web_1234567890"
}
```

### CORS Configuration

The endpoint is configured to accept requests from `https://shadowspark-tech.org`. To add more domains, modify the CORS middleware in `server.js`.

## Deployment

### Railway

```bash
# Procfile is already configured
git push railway main
```

Set environment variables in Railway dashboard:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER`
- `ANTHROPIC_API_KEY`
- `NODE_ENV=production`

### Heroku

```bash
heroku create your-app-name
git push heroku main
```

Set config vars:
```bash
heroku config:set ANTHROPIC_API_KEY=sk-ant-...
heroku config:set TWILIO_ACCOUNT_SID=ACxxx...
# ... other vars
```

## Production Considerations

### Scaling Conversation History

The current implementation uses in-memory `Map()` for conversation history. For production at scale:

**Option 1: Redis**
```javascript
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

async function getHistory(phoneNumber) {
  const history = await redis.get(`conv:${phoneNumber}`);
  return history ? JSON.parse(history) : [];
}

async function addToHistory(phoneNumber, role, content) {
  const history = await getHistory(phoneNumber);
  history.push({ role, content });
  await redis.setex(`conv:${phoneNumber}`, 86400, JSON.stringify(history));
}
```

**Option 2: Database**
Use the existing Prisma setup from the TypeScript server.

### Rate Limiting

Consider adding rate limiting for the `/api/chat` endpoint:

```javascript
const rateLimit = require('express-rate-limit');

const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/chat', chatLimiter);
```

### Error Monitoring

Integrate error tracking:

```javascript
const Sentry = require('@sentry/node');

Sentry.init({ dsn: process.env.SENTRY_DSN });

app.use(Sentry.Handlers.errorHandler());
```

## Switching Between Servers

### Use TypeScript Server (Recommended for Production)

```bash
npm run dev    # Development
npm run build && npm start  # Production
```

### Use Claude Server (Simpler Alternative)

```bash
npm run dev:claude    # Development
npm run start:claude  # Production
```

## API Cost Comparison

### Claude (Anthropic)
- Input: $3 per million tokens
- Output: $15 per million tokens
- Model: claude-sonnet-4-20250514

### OpenAI (TypeScript Server)
- Input: $0.15 per million tokens
- Output: $0.60 per million tokens  
- Model: gpt-4o-mini (default)

## Troubleshooting

### Claude API Errors

**403 Forbidden**
- Check your API key is correct
- Verify your Anthropic account has credits

**400 Bad Request**
- Check the model name is correct
- Verify message format

**Rate Limit**
- Anthropic has rate limits per tier
- Check your plan at console.anthropic.com

### Twilio Issues

**Messages not received**
- Verify webhook URL is publicly accessible
- Check Twilio webhook logs in console
- Ensure TWILIO_WHATSAPP_NUMBER format is correct: `whatsapp:+1234567890`

**Messages not sent**
- Check Twilio account balance
- Verify phone number is approved for WhatsApp
- Check status callback endpoint for error codes

## Knowledge Base

Both servers use the same knowledge base from `src/config/shadowspark-knowledge.js`. To update:

1. Edit `src/config/shadowspark-knowledge.js`
2. Restart the server
3. Changes apply immediately

## Support

For issues or questions:
- Email: hello@shadowspark-tech.org
- Website: https://shadowspark-tech.org

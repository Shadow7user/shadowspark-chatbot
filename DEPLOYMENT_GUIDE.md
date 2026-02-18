# 🚀 Complete Deployment Guide - ShadowSpark AI Chatbot

This guide will walk you through **every step** needed to deploy your chatbot so it can respond on your website or via WhatsApp.

## 📋 Overview

You've successfully tested the chatbot locally. Now you need to:

1. **Set up a database** (PostgreSQL) - Store conversations
2. **Configure Twilio** (WhatsApp) - Enable WhatsApp messaging
3. **Deploy to hosting** (Railway/Heroku) - Make it publicly accessible
4. **Configure webhooks** - Connect Twilio to your server
5. **Add to website** (Optional) - Embed chat widget

---

## 🎯 Choose Your Deployment Path

### Option 1: Full Production Setup (TypeScript Server)
**Best for:** Production use, multiple clients, advanced features
- Database persistence
- Redis queues
- Analytics tracking
- Multi-client support

### Option 2: Simple Setup (Claude Server)
**Best for:** Quick deployment, single use case
- No database required
- In-memory storage
- Simpler configuration

**We'll cover both paths below.**

---

## 📦 PART 1: Production Setup (TypeScript Server)

### Step 1: Set Up PostgreSQL Database

#### Option A: Using Neon (Recommended - Free Tier)

1. **Create Account**
   - Go to https://neon.tech
   - Sign up for free account

2. **Create Database**
   ```
   - Click "Create Project"
   - Name: shadowspark-chatbot
   - Region: Choose closest to you
   - Click "Create"
   ```

3. **Get Connection String**
   ```
   - Go to Dashboard → Connection Details
   - Copy "Connection string"
   - It looks like: postgresql://user:password@ep-xxx.region.aws.neon.tech/shadowspark_chatbot
   ```

4. **Add to .env**
   ```bash
   DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/shadowspark_chatbot?sslmode=require&pgbouncer=true"
   DIRECT_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/shadowspark_chatbot?sslmode=require"
   ```

#### Option B: Using Railway PostgreSQL

```bash
# In Railway dashboard, add PostgreSQL service
# It will automatically set DATABASE_URL
```

### Step 2: Set Up Redis (Optional but Recommended)

#### Using Upstash (Free Tier)

1. **Create Account**
   - Go to https://console.upstash.com
   - Sign up for free

2. **Create Redis Database**
   ```
   - Click "Create Database"
   - Name: shadowspark-redis
   - Region: Choose closest to you
   - Type: Regional (free)
   - Click "Create"
   ```

3. **Get Redis URL**
   ```
   - Copy the Redis URL from dashboard
   - Format: redis://default:xxxxx@region.upstash.io:6379
   ```

4. **Add to .env**
   ```bash
   REDIS_URL="redis://default:xxxxx@region.upstash.io:6379"
   ```

**Note:** Redis is optional. The app works without it using synchronous processing.

### Step 3: Configure Twilio for WhatsApp

1. **Create Twilio Account**
   - Go to https://www.twilio.com/try-twilio
   - Sign up (includes free credits)

2. **Get Twilio Credentials**
   ```
   Dashboard → Account Info:
   - Account SID (starts with AC...)
   - Auth Token
   ```

3. **Set Up WhatsApp**
   
   **For Testing (Sandbox):**
   ```
   - Go to Messaging → Try it out → Send a WhatsApp message
   - Follow instructions to join sandbox
   - WhatsApp Number: whatsapp:+14155238886
   ```

   **For Production (Approved Number):**
   ```
   - Go to Messaging → WhatsApp → Senders
   - Request production access
   - Submit business verification
   - Get your dedicated WhatsApp number
   ```

4. **Add to .env**
   ```bash
   TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   TWILIO_AUTH_TOKEN="your-auth-token-here"
   TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"  # Sandbox
   # OR
   TWILIO_WHATSAPP_NUMBER="whatsapp:+1234567890"   # Production
   ```

### Step 4: Complete Your .env File

Your `.env` should now have:

```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Twilio WhatsApp
TWILIO_ACCOUNT_SID="ACxxxxxxxx..."
TWILIO_AUTH_TOKEN="your-token"
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"

# OpenAI
OPENAI_API_KEY="sk-proj-PPdA..."
OPENAI_MODEL="gpt-4o-mini"
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.7

# Redis (optional)
REDIS_URL="redis://..."

# Server
PORT=3001
NODE_ENV=production
LOG_LEVEL=info

# Webhook (will get this after deployment)
WEBHOOK_BASE_URL="https://your-app.railway.app"

# Admin (for /setup/* endpoints)
ADMIN_SECRET="your-secret-at-least-16-chars"
```

### Step 5: Initialize Database Schema

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Verify it worked
# You should see tables created in your Neon dashboard
```

### Step 6: Seed Demo Configuration

Start your server locally first:

```bash
npm run dev
```

Then in another terminal:

```bash
# Create demo client config
curl -X GET http://localhost:3001/setup/seed-demo \
  -H "x-admin-secret: your-secret-at-least-16-chars"
```

You should see:
```json
{
  "message": "Demo config created",
  "config": { "clientId": "shadowspark-demo", ... }
}
```

### Step 7: Deploy to Railway

#### Install Railway CLI

```bash
npm install -g @railway/cli
```

#### Deploy

```bash
# Login
railway login

# Initialize project
railway init

# Link to project (or create new)
railway link

# Add environment variables
railway variables set NODE_ENV=production
railway variables set DATABASE_URL="postgresql://..."
railway variables set OPENAI_API_KEY="sk-proj-..."
railway variables set TWILIO_ACCOUNT_SID="AC..."
railway variables set TWILIO_AUTH_TOKEN="..."
railway variables set TWILIO_WHATSAPP_NUMBER="whatsapp:+..."
railway variables set REDIS_URL="redis://..."
railway variables set ADMIN_SECRET="your-secret-16-chars"

# Deploy
railway up

# Get your URL
railway domain
# Output: https://shadowspark-chatbot-production.up.railway.app
```

#### Set WEBHOOK_BASE_URL

```bash
railway variables set WEBHOOK_BASE_URL="https://shadowspark-chatbot-production.up.railway.app"

# Redeploy to apply changes
railway up
```

### Step 8: Configure Twilio Webhook

1. **Go to Twilio Console**
   - Navigate to Messaging → Try it out → WhatsApp sandbox settings
   - OR for production: Messaging → WhatsApp → Senders → [Your Number] → Configuration

2. **Set Webhook URL**
   ```
   When a message comes in:
   URL: https://your-app.railway.app/webhooks/whatsapp
   Method: POST
   ```

3. **Set Status Callback (Optional)**
   ```
   Status callback URL:
   https://your-app.railway.app/webhooks/whatsapp/status
   ```

4. **Save Configuration**

### Step 9: Test WhatsApp Integration

1. **Send Test Message**
   - Open WhatsApp
   - Send message to your Twilio number
   - Try: "Hello"

2. **Check Logs**
   ```bash
   railway logs
   # You should see incoming message logs
   ```

3. **Verify Response**
   - You should receive an AI response within seconds
   - Response should use ShadowSpark knowledge base

---

## 🚀 PART 2: Simple Setup (Claude Server)

For a simpler deployment without database:

### Step 1: Configure Environment

```bash
# .env file
TWILIO_ACCOUNT_SID="ACxxxxxxxx..."
TWILIO_AUTH_TOKEN="your-token"
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"
ANTHROPIC_API_KEY="sk-ant-..."  # Instead of OpenAI
PORT=3000
NODE_ENV=production
```

### Step 2: Deploy

**Railway:**
```bash
railway login
railway init
railway variables set NODE_ENV=production
railway variables set ANTHROPIC_API_KEY="sk-ant-..."
railway variables set TWILIO_ACCOUNT_SID="AC..."
railway variables set TWILIO_AUTH_TOKEN="..."
railway variables set TWILIO_WHATSAPP_NUMBER="whatsapp:+..."

# Deploy
railway up
```

**Heroku:**
```bash
heroku create shadowspark-chatbot
heroku config:set ANTHROPIC_API_KEY="sk-ant-..."
heroku config:set TWILIO_ACCOUNT_SID="AC..."
heroku config:set TWILIO_AUTH_TOKEN="..."
heroku config:set TWILIO_WHATSAPP_NUMBER="whatsapp:+..."
git push heroku main
```

### Step 3: Configure Webhook

Same as Step 8 in Part 1, but use:
- URL: `https://your-app.railway.app/webhooks/whatsapp`

**Note:** Claude server uses in-memory storage, so conversations reset on restart.

---

## 🌐 PART 3: Add to Your Website

### Option 1: Using the /api/chat Endpoint

Add this to your website:

```html
<!DOCTYPE html>
<html>
<head>
    <title>ShadowSpark Chat</title>
    <style>
        #chat-widget {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 350px;
            height: 500px;
            border: 1px solid #ccc;
            border-radius: 10px;
            background: white;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
        }
        #chat-header {
            background: #1a73e8;
            color: white;
            padding: 15px;
            border-radius: 10px 10px 0 0;
            font-weight: bold;
        }
        #chat-messages {
            flex: 1;
            padding: 15px;
            overflow-y: auto;
        }
        .message {
            margin: 10px 0;
            padding: 10px;
            border-radius: 8px;
        }
        .user-message {
            background: #e3f2fd;
            text-align: right;
        }
        .ai-message {
            background: #f5f5f5;
        }
        #chat-input {
            display: flex;
            padding: 10px;
            border-top: 1px solid #ccc;
        }
        #message-input {
            flex: 1;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 5px;
        }
        #send-button {
            margin-left: 10px;
            padding: 10px 20px;
            background: #1a73e8;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div id="chat-widget">
        <div id="chat-header">
            💬 ShadowSpark AI Assistant
        </div>
        <div id="chat-messages">
            <div class="message ai-message">
                Hello! Welcome to ShadowSpark Technologies. How can I help you today?
            </div>
        </div>
        <div id="chat-input">
            <input type="text" id="message-input" placeholder="Type your message...">
            <button id="send-button">Send</button>
        </div>
    </div>

    <script>
        const API_URL = 'https://your-app.railway.app/api/chat';
        let sessionId = null;

        async function sendMessage() {
            const input = document.getElementById('message-input');
            const message = input.value.trim();
            
            if (!message) return;
            
            // Display user message
            addMessage(message, 'user');
            input.value = '';
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: message,
                        sessionId: sessionId
                    })
                });
                
                const data = await response.json();
                sessionId = data.sessionId;
                
                // Display AI response
                addMessage(data.reply, 'ai');
            } catch (error) {
                addMessage('Sorry, there was an error. Please try again.', 'ai');
            }
        }
        
        function addMessage(text, sender) {
            const messagesDiv = document.getElementById('chat-messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${sender}-message`;
            messageDiv.textContent = text;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        // Event listeners
        document.getElementById('send-button').addEventListener('click', sendMessage);
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    </script>
</body>
</html>
```

### Option 2: Using iframe

```html
<iframe 
    src="https://your-app.railway.app/chat-widget.html" 
    width="350" 
    height="500" 
    frameborder="0">
</iframe>
```

### Option 3: CORS Configuration

If you're embedding from a different domain, update the CORS settings:

**TypeScript Server (src/server.ts):**
```typescript
await app.register(cors, { 
  origin: ['https://shadowspark-tech.org', 'https://yourdomain.com']
});
```

**Claude Server (server.js):**
```javascript
app.use('/api/chat', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://yourdomain.com');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Server is running (check Railway logs)
- [ ] Database connection works (no connection errors in logs)
- [ ] WhatsApp receives test message
- [ ] AI responds correctly via WhatsApp
- [ ] Website chat API works (if implemented)
- [ ] Conversations persist (TypeScript server only)
- [ ] No errors in production logs

---

## 🔧 Troubleshooting

### Issue: WhatsApp not receiving messages

**Check:**
1. Webhook URL is correct in Twilio
2. Server is running (railway logs)
3. PORT is correct (usually 3001 for TypeScript, 3000 for Claude)
4. Twilio credentials are correct

**Fix:**
```bash
# Verify webhook
curl https://your-app.railway.app/health
# Should return: {"status":"healthy"}

# Check Twilio webhook logs
# Go to Twilio Console → Monitor → Logs → Errors
```

### Issue: Database connection error

**Check:**
1. DATABASE_URL is correct
2. IP whitelist allows connections (Neon auto-allows)
3. Schema is pushed

**Fix:**
```bash
# Redeploy with correct DATABASE_URL
railway variables set DATABASE_URL="postgresql://..."
railway up

# Push schema again
railway run npm run db:push
```

### Issue: AI not responding

**Check:**
1. OpenAI API key is valid
2. OpenAI account has credits
3. Knowledge base loaded correctly

**Fix:**
```bash
# Check logs for AI errors
railway logs | grep -i "error\|failed"

# Verify API key
railway variables get OPENAI_API_KEY
```

### Issue: CORS errors on website

**Fix:**
Add your domain to CORS configuration (see Part 3, Option 3)

### Issue: 500 Internal Server Error

**Check:**
```bash
# View detailed logs
railway logs --tail 100

# Common causes:
# - Missing environment variables
# - Database connection failed
# - Redis connection failed (if used)
```

---

## 📊 Monitoring Your Deployment

### Railway Dashboard
- View logs: `railway logs`
- Check metrics: CPU, Memory usage
- View deployments: History of deploys

### Twilio Dashboard
- Message logs: See all WhatsApp messages
- Error logs: Failed webhook calls
- Usage: Track message volume

### Database (Neon)
- Query editor: Run SQL queries
- Metrics: Connection count, query time
- Backups: Automatic daily backups

---

## 💰 Cost Estimates

### Monthly Costs (Production)

**Infrastructure:**
- Railway: $5/month (Hobby plan) or $20/month (Pro)
- Neon (PostgreSQL): Free tier (3GB storage)
- Upstash (Redis): Free tier (10K commands/day)

**API Usage:**
- OpenAI: ~$0.10-$1/1000 conversations
- Twilio WhatsApp: $0.005/message received + sent

**Total:** ~$5-30/month depending on volume

---

## 🎓 Next Steps

1. **Test thoroughly** - Send various messages
2. **Monitor logs** - Watch for errors
3. **Set up alerts** - Get notified of issues
4. **Scale gradually** - Start with low traffic
5. **Optimize costs** - Monitor API usage

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Twilio WhatsApp Docs](https://www.twilio.com/docs/whatsapp)
- [Neon PostgreSQL Docs](https://neon.tech/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)

---

## 🆘 Need Help?

If you encounter issues:

1. Check the troubleshooting section above
2. Review Railway logs: `railway logs`
3. Check Twilio webhook logs
4. Verify all environment variables
5. Email: hello@shadowspark-tech.org

---

**You're now ready to deploy! Follow the steps for your chosen path (TypeScript or Claude server) and you'll have a live chatbot within 30 minutes.** 🚀

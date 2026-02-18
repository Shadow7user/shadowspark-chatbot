# Quick Start - Post-Setup Checklist

After cloning the repository and creating the necessary files, follow these steps to get your chatbot running.

## Step 1: Fill in .env with Credentials

After running `cp .env.example .env`, you need to fill in all the required credentials:

### Required Credentials

1. **Database (Neon PostgreSQL)**
   - Get from: https://console.neon.tech
   - Fill in: `DATABASE_URL` and `DIRECT_URL`

2. **Twilio WhatsApp**
   - Get from: https://console.twilio.com
   - Fill in: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`

3. **OpenAI**
   - Get from: https://platform.openai.com/api-keys
   - Fill in: `OPENAI_API_KEY`

4. **Redis (Upstash)**
   - Get from: https://console.upstash.com
   - Fill in: `REDIS_URL`

5. **Admin Secret (Production Only)**
   - Generate a secure random string (min 16 characters)
   - Fill in: `ADMIN_SECRET`

### Validation

After filling in your `.env` file, validate your setup:

```bash
npm run setup:validate
```

This will check all your credentials and connections before you proceed.

## Step 2: Message Templates (Optional)

> **Note:** Templates are NOT required for basic chatbot functionality.

This chatbot works in **reactive mode** (responds to incoming messages). Message templates are only needed if you want to send **proactive messages** to users who haven't messaged you in 24+ hours.

### When Templates Are Needed

- Welcome messages when users first opt-in
- Appointment reminders
- Order confirmations  
- Marketing campaigns

### When Templates Are NOT Needed (Current Implementation)

- ✅ Responding to incoming WhatsApp messages
- ✅ Continuing conversations within 24-hour window
- ✅ Customer service interactions
- ✅ AI-powered chat responses

### How to Create Templates (If Needed)

If you decide you need templates later:

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Messaging** → **Content Template Builder**
3. Create your template with variables
4. Submit for Meta approval (takes 24-48 hours)
5. Use the approved Content SID in your code

**For now, skip this step** - the chatbot works without templates.

## Step 3: Deploy to Railway

### 3.1 Initial Setup

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project (links to Railway project)
railway init
```

### 3.2 Set All Environment Variables

Set each variable one by one:

```bash
# Database
railway variables set DATABASE_URL="your-neon-url"
railway variables set DIRECT_URL="your-neon-direct-url"

# Twilio
railway variables set TWILIO_ACCOUNT_SID="ACxxx..."
railway variables set TWILIO_AUTH_TOKEN="your-token"
railway variables set TWILIO_WHATSAPP_NUMBER="whatsapp:+1234567890"

# OpenAI
railway variables set OPENAI_API_KEY="sk-..."

# Redis
railway variables set REDIS_URL="redis://..."

# Server config
railway variables set NODE_ENV="production"
railway variables set PORT="3001"
railway variables set LOG_LEVEL="info"

# Admin secret (REQUIRED for production)
railway variables set ADMIN_SECRET="your-secure-secret-at-least-16-chars"

# Webhook URL (set after first deploy - see below)
```

### 3.3 Deploy

```bash
# Push to trigger deployment
git push origin main
```

Or use Railway CLI:

```bash
railway up
```

### 3.4 Configure Webhook URL

After your first deployment:

1. **Get your Railway URL** from Railway dashboard
   - Example: `https://shadowspark-production.up.railway.app`

2. **Set WEBHOOK_BASE_URL in Railway**
   ```bash
   railway variables set WEBHOOK_BASE_URL="https://your-app.up.railway.app"
   ```

3. **Configure in Twilio Console**
   - Go to https://console.twilio.com
   - Navigate to **Messaging** → **Settings** → **WhatsApp Sandbox Settings**
     (or your WhatsApp number settings if using production)
   - Set **"When a message comes in"** to:
     ```
     https://your-app.up.railway.app/webhooks/whatsapp
     ```
   - Method: **POST**
   - Click **Save**

### 3.5 Verify Deployment

```bash
# Check health endpoint
curl https://your-app.up.railway.app/health

# Watch logs
railway logs --follow

# Send a test WhatsApp message
# You should see it being processed in the logs
```

## Step 4: Twilio Console Setup

### For Development (WhatsApp Sandbox)

1. Go to https://console.twilio.com
2. Navigate to **Messaging** → **Try it out** → **Send a WhatsApp message**
3. Follow the instructions to join the sandbox
   - Send the code (e.g., `join <your-code>`) to the sandbox number
4. Configure webhook (see Step 3.4 above)
5. Test by sending messages to the sandbox number

### For Production (WhatsApp Business API)

#### 4.1 Request Access

1. Go to https://console.twilio.com
2. Navigate to **Messaging** → **Services** → **WhatsApp**
3. Click **Request Access**
4. Complete the business verification form

#### 4.2 Business Verification

Submit these documents (verification takes 1-5 business days):
- Business registration documents
- Proof of business address
- Identity verification of business owner

#### 4.3 Business Profile Setup

After approval:

1. **Purchase a phone number**
   - In Twilio Console → **Phone Numbers** → **Buy a Number**
   
2. **Enable WhatsApp** on the number
   - Select your number → Enable WhatsApp

3. **Configure business profile**
   - Navigate to your WhatsApp number settings
   - Fill in:
     - Business Name
     - Business Description
     - Business Address
     - Business Email
     - Business Website
   
4. **Upload logo**
   - Square image, at least 192x192 pixels
   - PNG or JPEG format
   - Must represent your business

5. **Submit for Meta review**
   - Meta will review your business profile
   - Usually approved within 1-2 business days

6. **Configure webhook** (same as Step 3.4)

## Step 5: Final Verification

Run through this checklist:

- [ ] `.env` file is filled with all credentials
- [ ] `npm run setup:validate` passes
- [ ] Code is deployed to Railway
- [ ] `WEBHOOK_BASE_URL` is set in Railway
- [ ] Twilio webhook is configured
- [ ] Health endpoint responds: `curl https://your-app.up.railway.app/health`
- [ ] Test message sent to WhatsApp number
- [ ] Bot responds with AI-generated message
- [ ] No errors in Railway logs

## Troubleshooting

### "Setup validation failed"

Run `npm run setup:validate` and fix any failing checks. Common issues:
- Wrong API key format
- Expired or invalid credentials
- Network connectivity issues

### "Webhook not receiving messages"

Check:
1. Webhook URL in Twilio matches Railway URL exactly
2. `WEBHOOK_BASE_URL` environment variable is set in Railway
3. Railway app is running (check logs)
4. Webhook uses HTTPS (not HTTP)

### "Bot not responding"

Check Railway logs:
1. Message received? → Check Twilio webhook configuration
2. AI called? → Check OpenAI API key and credits
3. Response sent? → Check Twilio credentials
4. Database errors? → Check Neon database connection

### "Invalid signature" errors

- In development: Signature validation is skipped (warning logged)
- In production: Make sure `TWILIO_AUTH_TOKEN` is correct

## Next Steps

Once everything is working:

1. **Customize AI responses**
   - Modify client configuration in database
   - Update system prompts for your use case

2. **Monitor usage**
   - Check Railway logs regularly
   - Monitor OpenAI token usage
   - Set up token caps per client

3. **Scale up**
   - Upgrade Railway plan if needed
   - Upgrade Upstash Redis if queue grows
   - Monitor Neon database size

## Support

For detailed information:
- Full setup guide: [SETUP_GUIDE.md](SETUP_GUIDE.md)
- Architecture details: [README.md](README.md)
- Open an issue on GitHub for problems

---

**Remember:** The chatbot works in reactive mode by default. You don't need message templates unless you want to send proactive messages outside the 24-hour window.

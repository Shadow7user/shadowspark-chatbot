# ✅ Pre-Deployment Checklist

Quick reference: What you need before your chatbot goes live.

## 🎯 Required Steps (Choose Your Path)

### Path A: Full Production (TypeScript Server)

- [ ] **1. Database (PostgreSQL)**
  - [ ] Sign up at [Neon.tech](https://neon.tech) (free)
  - [ ] Create project `shadowspark-chatbot`
  - [ ] Copy DATABASE_URL
  - [ ] Copy DIRECT_URL
  - [ ] Add to `.env` file

- [ ] **2. Redis (Optional)**
  - [ ] Sign up at [Upstash](https://console.upstash.com) (free)
  - [ ] Create Redis database
  - [ ] Copy REDIS_URL
  - [ ] Add to `.env` file

- [ ] **3. OpenAI API**
  - [ ] Already have: `OPENAI_API_KEY=sk-proj-PPdA...`
  - [ ] Verify account has credits
  - [ ] Already in `.env` ✓

- [ ] **4. Twilio WhatsApp**
  - [ ] Sign up at [Twilio.com](https://twilio.com/try-twilio)
  - [ ] Get Account SID (starts with AC)
  - [ ] Get Auth Token
  - [ ] Join WhatsApp Sandbox OR request production number
  - [ ] Add all three to `.env`:
    ```
    TWILIO_ACCOUNT_SID=ACxxxxx
    TWILIO_AUTH_TOKEN=xxxxx
    TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
    ```

- [ ] **5. Initialize Database**
  ```bash
  npm run db:generate
  npm run db:push
  ```

- [ ] **6. Deploy to Railway**
  ```bash
  npm install -g @railway/cli
  railway login
  railway init
  railway variables set ... (all env vars)
  railway up
  ```

- [ ] **7. Get Deployment URL**
  ```bash
  railway domain
  # Example: https://shadowspark-production.up.railway.app
  ```

- [ ] **8. Update WEBHOOK_BASE_URL**
  ```bash
  railway variables set WEBHOOK_BASE_URL="https://your-url.railway.app"
  railway up
  ```

- [ ] **9. Configure Twilio Webhook**
  - [ ] Go to Twilio Console → WhatsApp Sandbox
  - [ ] Set webhook: `https://your-url.railway.app/webhooks/whatsapp`
  - [ ] Method: POST
  - [ ] Save

- [ ] **10. Test**
  - [ ] Send "Hello" to WhatsApp number
  - [ ] Should receive AI response
  - [ ] Check Railway logs for errors

### Path B: Simple (Claude Server - No Database)

- [ ] **1. Anthropic Claude API**
  - [ ] Get key from [console.anthropic.com](https://console.anthropic.com)
  - [ ] Add to `.env`: `ANTHROPIC_API_KEY=sk-ant-...`

- [ ] **2. Twilio WhatsApp** (same as above)
  - [ ] Account SID
  - [ ] Auth Token  
  - [ ] WhatsApp Number

- [ ] **3. Deploy**
  ```bash
  railway variables set ANTHROPIC_API_KEY=...
  railway variables set TWILIO_ACCOUNT_SID=...
  railway variables set TWILIO_AUTH_TOKEN=...
  railway variables set TWILIO_WHATSAPP_NUMBER=...
  railway up
  ```

- [ ] **4. Configure Webhook** (same as Path A step 9)

- [ ] **5. Test** (same as Path A step 10)

---

## 🌐 For Website Integration (Optional)

- [ ] **1. Get your deployment URL**
  - Example: `https://your-app.railway.app`

- [ ] **2. Test API endpoint**
  ```bash
  curl -X POST https://your-app.railway.app/api/chat \
    -H "Content-Type: application/json" \
    -d '{"message": "Hello"}'
  ```

- [ ] **3. Add chat widget to website**
  - Copy HTML from `DEPLOYMENT_GUIDE.md` Part 3
  - Update API_URL to your deployment URL
  - Add to your website

- [ ] **4. Configure CORS** (if needed)
  - Add your website domain to CORS settings
  - Redeploy

---

## 🔍 Verification

After deployment, check:

- [ ] Server health: `curl https://your-url.railway.app/health`
- [ ] WhatsApp test: Send message, get response
- [ ] Railway logs: `railway logs` (no errors)
- [ ] Website chat: Test from your site (if implemented)

---

## 📊 What Each File Does

| File | Purpose |
|------|---------|
| `.env` | Configuration (API keys, database URL) |
| `src/server.ts` | TypeScript production server |
| `server.js` | Claude simple server |
| `src/config/shadowspark-knowledge.js` | AI knowledge base |
| `test-conversation.js` | Local testing script |

---

## 🎯 Quick Start Commands

**Test Locally:**
```bash
npm run test:chat              # Test with your API key
npm run dev                    # Run TypeScript server
npm run dev:claude             # Run Claude server
```

**Deploy:**
```bash
railway up                     # Deploy to Railway
railway logs                   # View logs
railway domain                 # Get URL
```

**Database:**
```bash
npm run db:generate            # Generate Prisma client
npm run db:push                # Push schema to DB
```

---

## ⏱️ Time Estimates

- **Database Setup:** 5 minutes
- **Twilio Setup:** 10 minutes
- **Railway Deploy:** 5 minutes
- **Configure Webhook:** 2 minutes
- **Test:** 3 minutes

**Total:** ~25 minutes for full production setup

---

## 💡 Tips

1. **Start with Sandbox:** Use Twilio sandbox before production approval
2. **Test Locally First:** Run `npm run dev` before deploying
3. **Check Logs:** Always check `railway logs` if something fails
4. **Verify Credentials:** Double-check all API keys are correct
5. **Monitor Costs:** Start with free tiers, upgrade as needed

---

## 🆘 Common Issues

**"Cannot connect to database"**
→ Check DATABASE_URL is correct

**"Twilio webhook failed"**
→ Verify webhook URL matches deployment URL

**"OpenAI API error"**
→ Check API key is valid and account has credits

**"CORS error on website"**
→ Add your domain to CORS configuration

---

## 📞 Support

- **Deployment Guide:** See `DEPLOYMENT_GUIDE.md` for detailed steps
- **Quick Test:** See `QUICKSTART_TEST.md` for local testing
- **Examples:** See `CONVERSATION_EXAMPLE.md` for sample conversations

---

**Ready to deploy?** Choose your path (A or B) and follow the checklist! 🚀

# 🎯 ShadowSpark AI Chatbot - Conversation Example

## What You'll See When You Say "Hello"

When you send a simple greeting like "Hello" to the ShadowSpark AI chatbot, here's what happens:

### 📝 Example Conversation

```
═══════════════════════════════════════════════════════════════════
  🧪 SHADOWSPARK AI CHATBOT - CONVERSATION TEST
═══════════════════════════════════════════════════════════════════

✓ OpenAI API Key: Found
✓ Knowledge Base: Loaded
✓ Model: gpt-4o-mini (default)

──────────────────────────────────────────────────────────────────

👤 USER: Hello

🤖 AI: Thinking...

──────────────────────────────────────────────────────────────────
🤖 AI RESPONSE:
──────────────────────────────────────────────────────────────────

Hello! Welcome to ShadowSpark Technologies! 👋

I'm ShadowSpark AI, your intelligent virtual assistant. We specialize in 
building AI automation solutions for Nigerian businesses, right here in 
Port Harcourt.

How can I help you today? Are you interested in:

• 🤖 **AI Chatbots** - Automate customer conversations on WhatsApp
• 📊 **Business Automation** - Save hours with intelligent workflow automation
• 💼 **Custom AI Solutions** - Tailored systems for your specific needs
• 🎓 **Learning about AI** - Understanding how AI can transform your business

Or feel free to just tell me what challenge you're facing, and I'll guide 
you to the right solution!

──────────────────────────────────────────────────────────────────

📊 CONVERSATION METADATA:
  • Tokens Used: 287
  • Prompt Tokens: 3,850
  • Completion Tokens: 137
  • Model: gpt-4o-mini

═══════════════════════════════════════════════════════════════════
  ✓ TEST COMPLETED SUCCESSFULLY
═══════════════════════════════════════════════════════════════════
```

## 🧠 What's Happening Behind the Scenes?

### 1. **Knowledge Base Loading**
The AI loads the complete ShadowSpark knowledge base, which includes:
- Company information (location, mission, vision)
- 10 detailed services with pricing (₦150,000 - ₦800,000)
- FAQs about how the services work
- Conversation guidelines (Nigerian English, Pidgin support)

### 2. **System Prompt**
The AI receives this instruction:
```
You are ShadowSpark AI, the intelligent virtual assistant for 
ShadowSpark Technologies — an AI automation company based in 
Port Harcourt, Nigeria.

Your personality:
- Warm, confident, and professional
- Knowledgeable about AI and Nigerian business landscape
- Direct about pricing
- Can speak Pidgin English if needed
- Enthusiastic about technology
```

### 3. **Response Generation**
The AI:
- Greets warmly and identifies itself
- Offers helpful service categories
- Invites further conversation
- Maintains professional yet friendly tone

## 📋 How to Run This Yourself

### Step 1: Set Up Your OpenAI API Key

Edit the `.env` file and replace the placeholder with your actual key:

```bash
OPENAI_API_KEY=sk-proj-YOUR_ACTUAL_KEY_HERE
```

Get your API key from: https://platform.openai.com/api-keys

### Step 2: Run the Test

```bash
node test-conversation.js
```

### Step 3: Try Different Messages

Modify the `userMessage` variable in `test-conversation.js` to test different queries:

```javascript
const userMessage = 'How much does a WhatsApp chatbot cost?';
// or
const userMessage = 'I need help automating my business';
// or
const userMessage = 'Wetin una dey do?'; // Pidgin English
```

## 💬 More Example Conversations

### Example 2: Asking About Pricing

**USER:** "How much does a WhatsApp chatbot cost?"

**AI:** "Great question! Our WhatsApp AI Chatbot costs:

**Setup:** ₦350,000 (one-time)
**Hosting:** ₦30,000/month

This includes:
- Custom training on your business (30-min interview)
- 50 FAQ questions programmed
- 24/7 automated responses in English or Pidgin
- Lead capture & appointment booking
- Human agent handoff
- Monthly analytics reports

**ROI:** Most clients see the bot handling 70%+ of messages within the first 
week, freeing up 3-5 hours daily!

Would you like to know more about what's included, or shall we discuss your 
specific business needs?"

### Example 3: General Business Inquiry

**USER:** "I own a small restaurant in Port Harcourt"

**AI:** "Fantastic! A restaurant in Port Harcourt — that's exactly the kind 
of business we love helping! 🍽️

Here's how we can help you:

**WhatsApp Auto-Responder** (₦150k setup + ₦20k/month)
- Instant replies for "What's on the menu?", "Are you open?", "Where are you?"
- Menu-driven experience for customers
- Takes orders directly through WhatsApp

**Business Process Autopilot** (₦100k/month)
- Automated invoice generation
- Payment reminders
- Daily sales reports
- Inventory alerts

With 20+ customer messages per day, automation could save you 2-3 hours daily 
and ensure no customer query goes unanswered, especially during busy hours!

Would you like to book a free 30-minute consultation to see how this would 
work for your restaurant specifically?"

## 🎨 Key Features of the AI

### ✅ Context Awareness
- Remembers conversation history (last 20 messages)
- Builds on previous exchanges
- Maintains conversation flow

### ✅ Nigerian Business Focus
- Uses Naira (₦) for all pricing
- Understands Port Harcourt location references
- Can switch to Pidgin English when appropriate
- Culturally aware responses

### ✅ Service Knowledge
- 10 complete service offerings
- Detailed pricing breakdown
- ROI examples and statistics
- Payment terms and timelines

### ✅ Conversation Goals
1. Understand customer needs
2. Educate on AI automation benefits
3. Match with appropriate service
4. Guide toward free consultation
5. Build rapport naturally

## 🚀 Running the Full Server

For production WhatsApp integration:

```bash
# Install dependencies
npm install

# Set up database and configuration
# (See README.md for full setup)

# Run TypeScript server
npm run dev
```

The full server includes:
- Database persistence (PostgreSQL)
- Redis queue for async processing
- Twilio WhatsApp integration
- Analytics and token tracking
- Multi-client support

## 💡 Tips for Best Results

1. **Be Specific**: The more context you provide, the better the AI can help
2. **Use Natural Language**: No need for formal commands
3. **Ask Follow-ups**: The AI maintains conversation context
4. **Try Pidgin**: Test with "Wetin be the price?" or "How una dey?"
5. **Test Edge Cases**: Try complex scenarios to see how it handles

## 📊 Cost Per Conversation

Using GPT-4o-mini (default):
- **Input:** $0.15 per million tokens
- **Output:** $0.60 per million tokens

Average conversation (5 messages):
- ~4,000 input tokens (includes knowledge base)
- ~500 output tokens
- **Cost:** ~$0.0009 per conversation (less than ₦1)

## 🔧 Troubleshooting

### "API key invalid"
- Check your OpenAI account has credits
- Verify the key starts with `sk-proj-` or `sk-`
- Ensure no extra spaces in .env file

### "Rate limit exceeded"
- OpenAI has usage tiers
- Wait a few seconds and try again
- Check your account limits

### "Network error"
- Verify internet connection
- Check OpenAI API status
- Try with a VPN if blocked in your region

## 📚 Next Steps

1. ✅ Dependencies installed
2. ✅ Test script created
3. ⏳ Add your real OpenAI API key to `.env`
4. ⏳ Run `node test-conversation.js`
5. ⏳ See your first AI conversation!

---

**Need Help?**
- Email: hello@shadowspark-tech.org
- Website: https://shadowspark-tech.org

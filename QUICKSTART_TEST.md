# 🎯 Quick Start - Test Your Chatbot

## ✅ What's Ready

1. ✅ **Dependencies installed** - All npm packages are set up
2. ✅ **Test script created** - `test-conversation.js` ready to run
3. ✅ **Knowledge base loaded** - ShadowSpark company info included
4. ⏳ **Your OpenAI API key needed** - Add it to `.env` file

## 🚀 Run Your First Conversation in 2 Steps

### Step 1: Add Your OpenAI API Key

Open the `.env` file and replace the placeholder with your actual key:

```bash
# Edit .env file
OPENAI_API_KEY=sk-proj-YOUR_ACTUAL_KEY_HERE
```

### Step 2: Run the Test

```bash
node test-conversation.js
```

That's it! You'll see:
- 👤 Your message: "Hello"
- 🤖 AI's intelligent response
- 📊 Token usage statistics

## 📖 What You'll See

The AI will respond like this:

```
Hello! Welcome to ShadowSpark Technologies! 👋

I'm ShadowSpark AI, your intelligent virtual assistant. We specialize 
in building AI automation solutions for Nigerian businesses, right here 
in Port Harcourt.

How can I help you today? Are you interested in:
• 🤖 AI Chatbots
• 📊 Business Automation
• 💼 Custom AI Solutions
• 🎓 Learning about AI
...
```

## 🧪 Try Different Messages

Edit `test-conversation.js` line 37 to test different queries:

```javascript
const userMessage = 'Hello';  // ← Change this!
```

Try:
- "How much does a WhatsApp chatbot cost?"
- "I need help with my business"
- "Wetin una dey do?" (Pidgin)

## 📁 Files Created

- `test-conversation.js` - Test script
- `.env` - Configuration (add your API key here!)
- `CONVERSATION_EXAMPLE.md` - Detailed examples and documentation

## 🔧 Troubleshooting

**Can't connect to API?**
- Check internet connection
- Verify API key is correct
- Ensure OpenAI account has credits

**Dependencies missing?**
```bash
npm install
```

## 📚 Full Documentation

- `CONVERSATION_EXAMPLE.md` - Detailed conversation examples
- `README.md` - Full server setup guide
- `CLAUDE_SERVER.md` - Alternative Claude AI setup

---

**Questions?** See `CONVERSATION_EXAMPLE.md` for detailed examples and tips!

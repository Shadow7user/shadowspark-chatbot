/**
 * ShadowSpark Technologies — AI-Powered WhatsApp Webhook
 * 
 * This replaces the basic menu-driven handler with a real AI
 * conversation engine powered by Claude API.
 * 
 * How it works:
 *   1. Customer sends message via WhatsApp
 *   2. Twilio forwards it to this webhook
 *   3. We send the message to Claude API with ShadowSpark's knowledge base
 *   4. Claude generates an intelligent, contextual response
 *   5. We send the response back to the customer via Twilio
 * 
 * Required env vars:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_WHATSAPP_NUMBER
 *   ANTHROPIC_API_KEY        ← Get from console.anthropic.com
 */

require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const { SYSTEM_PROMPT } = require('./knowledge-base');

const app = express();
const PORT = process.env.PORT || 3000;

// Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ============================================================
// IN-MEMORY CONVERSATION HISTORY (per phone number)
// For production, replace with Redis or a database
// ============================================================
const conversationHistory = new Map();

const MAX_HISTORY_LENGTH = 20; // Keep last 20 messages per user
const HISTORY_TTL = 24 * 60 * 60 * 1000; // Clear after 24 hours

function getHistory(phoneNumber) {
  const entry = conversationHistory.get(phoneNumber);
  if (!entry) return [];
  
  // Check if expired
  if (Date.now() - entry.lastUpdated > HISTORY_TTL) {
    conversationHistory.delete(phoneNumber);
    return [];
  }
  
  return entry.messages;
}

function addToHistory(phoneNumber, role, content) {
  let entry = conversationHistory.get(phoneNumber);
  
  if (!entry) {
    entry = { messages: [], lastUpdated: Date.now() };
  }
  
  entry.messages.push({ role, content });
  entry.lastUpdated = Date.now();
  
  // Trim to max length
  if (entry.messages.length > MAX_HISTORY_LENGTH) {
    entry.messages = entry.messages.slice(-MAX_HISTORY_LENGTH);
  }
  
  conversationHistory.set(phoneNumber, entry);
}

// Clean up old conversations every hour
setInterval(() => {
  const now = Date.now();
  for (const [phone, entry] of conversationHistory.entries()) {
    if (now - entry.lastUpdated > HISTORY_TTL) {
      conversationHistory.delete(phone);
    }
  }
}, 60 * 60 * 1000);

// ============================================================
// CLAUDE API CALL
// ============================================================

async function getAIResponse(userMessage, phoneNumber, profileName) {
  const history = getHistory(phoneNumber);
  
  // Add context about the user if we know their name
  let contextualPrompt = SYSTEM_PROMPT;
  if (profileName) {
    contextualPrompt += `\n\nThe customer's WhatsApp name is "${profileName}". Use their name naturally in conversation when appropriate.`;
  }

  // Build messages array with history for multi-turn conversation
  const messages = [
    ...history,
    { role: 'user', content: userMessage }
  ];

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,  // Keep responses concise for WhatsApp
        system: contextualPrompt,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Claude API error:', response.status, errorData);
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    const aiReply = data.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    // Save to conversation history
    addToHistory(phoneNumber, 'user', userMessage);
    addToHistory(phoneNumber, 'assistant', aiReply);

    return aiReply;
  } catch (error) {
    console.error('AI response error:', error.message);
    
    // Fallback response if AI fails
    return (
      "Thanks for your message! I'm experiencing a brief technical moment. 😊\n\n" +
      "In the meantime, here's how to reach us:\n" +
      "📧 hello@shadowspark-tech.org\n" +
      "🌐 shadowspark-tech.org\n\n" +
      "Or try messaging again in a moment — I'll be right back!"
    );
  }
}

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ShadowSpark AI WhatsApp Chatbot',
    version: '2.0.0',
    engine: 'Claude AI',
    activeConversations: conversationHistory.size,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

// ============================================================
// WHATSAPP WEBHOOK (MAIN ENDPOINT)
// ============================================================

app.post('/webhooks/whatsapp', async (req, res) => {
  try {
    const {
      From: from,
      To: to,
      Body: body,
      MessageSid: messageSid,
      ProfileName: profileName,
      NumMedia: numMedia,
    } = req.body;

    // Empty payload (health check from Twilio or test)
    if (!body && (!numMedia || numMedia === '0')) {
      return res.status(200).send('');
    }

    const phoneNumber = from?.replace('whatsapp:', '') || 'unknown';
    console.log(`\n📨 [${new Date().toISOString()}] ${profileName || phoneNumber}: "${body}"`);

    // Handle media messages
    if (numMedia && parseInt(numMedia) > 0) {
      const mediaReply = await getAIResponse(
        `[Customer sent a media file/image] ${body || 'No caption'}`,
        phoneNumber,
        profileName
      );
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message(mediaReply);
      return res.type('text/xml').send(twiml.toString());
    }

    // Get AI response
    const aiReply = await getAIResponse(body, phoneNumber, profileName);

    // WhatsApp has a 1600 character limit per message
    // Split long responses if needed
    const twiml = new twilio.twiml.MessagingResponse();
    
    if (aiReply.length > 1500) {
      // Split at the last paragraph break before 1500 chars
      const splitPoint = aiReply.lastIndexOf('\n\n', 1400);
      if (splitPoint > 0) {
        twiml.message(aiReply.substring(0, splitPoint));
        twiml.message(aiReply.substring(splitPoint + 2));
      } else {
        twiml.message(aiReply.substring(0, 1500));
        twiml.message(aiReply.substring(1500));
      }
    } else {
      twiml.message(aiReply);
    }

    console.log(`📤 Reply sent (${aiReply.length} chars)`);
    res.type('text/xml').send(twiml.toString());

  } catch (error) {
    console.error('❌ Webhook error:', error);

    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(
      "Apologies, I'm having a brief technical issue. Please try again in a moment, or reach us at hello@shadowspark-tech.org 🙏"
    );
    res.type('text/xml').send(twiml.toString());
  }
});

// ============================================================
// STATUS CALLBACK
// ============================================================

app.post('/webhooks/whatsapp/status', (req, res) => {
  const { MessageSid, MessageStatus, ErrorCode } = req.body;
  if (ErrorCode) {
    console.error(`⚠️ Message ${MessageSid}: ${MessageStatus} (Error: ${ErrorCode})`);
  }
  res.sendStatus(200);
});

// ============================================================
// WEBSITE CHATBOT API ENDPOINT
// This is for the chatbot on shadowspark-tech.org
// ============================================================

app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Use sessionId or generate one for conversation continuity
    const session = sessionId || `web_${Date.now()}`;
    
    const aiReply = await getAIResponse(message, session, null);

    res.json({
      reply: aiReply,
      sessionId: session,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({
      reply: "I'm having a brief technical moment. Please try again!",
      error: true,
    });
  }
});

// CORS for website chatbot
app.use('/api/chat', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://shadowspark-tech.org');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log('═'.repeat(55));
  console.log('  🔥 ShadowSpark AI Chatbot v2.0');
  console.log('  🧠 Engine: Claude AI (Sonnet)');
  console.log(`  📡 Server running on port ${PORT}`);
  console.log('  🔗 WhatsApp webhook: /webhooks/whatsapp');
  console.log('  💬 Website chat API: /api/chat');
  console.log('  ❤️  Health check:     /health');
  console.log('═'.repeat(55));
  
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('\n⚠️  WARNING: ANTHROPIC_API_KEY not set!');
    console.warn('   Get your key from: https://console.anthropic.com');
    console.warn('   Add to .env: ANTHROPIC_API_KEY=sk-ant-...\n');
  }
});

module.exports = { app };

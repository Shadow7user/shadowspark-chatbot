/**
 * Test Script - Simulate AI Conversation
 * 
 * This script demonstrates what a conversation with "hello" looks like
 * using the OpenAI API with ShadowSpark's knowledge base.
 */

require('dotenv').config();
const { generateText } = require('ai');
const { openai } = require('@ai-sdk/openai');
const { SYSTEM_PROMPT } = require('./knowledge-base');

async function testConversation() {
  console.log('═'.repeat(70));
  console.log('  🧪 SHADOWSPARK AI CHATBOT - CONVERSATION TEST');
  console.log('═'.repeat(70));
  console.log();

  // Check if API key is set
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ ERROR: OPENAI_API_KEY not found in .env file');
    console.log('\nPlease create a .env file with:');
    console.log('OPENAI_API_KEY=sk-your-key-here\n');
    process.exit(1);
  }

  console.log('✓ OpenAI API Key: Found');
  console.log('✓ Knowledge Base: Loaded');
  console.log('✓ Model: gpt-4o-mini (default)');
  console.log();
  console.log('─'.repeat(70));
  console.log();

  // User message
  const userMessage = 'Hello';
  console.log('👤 USER: ' + userMessage);
  console.log();

  // Build messages array
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage }
  ];

  try {
    console.log('🤖 AI: Thinking...');
    console.log();

    const model = openai(process.env.OPENAI_MODEL || 'gpt-4o-mini');
    
    const result = await generateText({
      model: model,
      messages: messages,
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 500,
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
    });

    // Display the response
    console.log('─'.repeat(70));
    console.log('🤖 AI RESPONSE:');
    console.log('─'.repeat(70));
    console.log();
    console.log(result.text);
    console.log();
    console.log('─'.repeat(70));
    console.log();

    // Display metadata
    console.log('📊 CONVERSATION METADATA:');
    console.log('  • Tokens Used:', result.usage?.totalTokens || 'N/A');
    console.log('  • Prompt Tokens:', result.usage?.promptTokens || 'N/A');
    console.log('  • Completion Tokens:', result.usage?.completionTokens || 'N/A');
    console.log('  • Model:', process.env.OPENAI_MODEL || 'gpt-4o-mini');
    console.log();
    console.log('═'.repeat(70));
    console.log('  ✓ TEST COMPLETED SUCCESSFULLY');
    console.log('═'.repeat(70));

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.log();
    
    if (error.message.includes('401')) {
      console.log('💡 TIP: Your API key may be invalid. Check your OPENAI_API_KEY in .env');
    } else if (error.message.includes('insufficient_quota')) {
      console.log('💡 TIP: Your OpenAI account may have insufficient credits.');
    } else if (error.message.includes('rate_limit')) {
      console.log('💡 TIP: You may have hit the rate limit. Wait a moment and try again.');
    }
    
    console.log();
    process.exit(1);
  }
}

// Run the test
testConversation().catch(console.error);

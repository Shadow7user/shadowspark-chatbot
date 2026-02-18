#!/usr/bin/env node
/**
 * ShadowSpark Technologies - WhatsApp Business Profile Setup
 * 
 * This script configures the Twilio WhatsApp Business Profile
 * and tests the webhook connection.
 */

require('dotenv').config();
const twilio = require('twilio');

// Load environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
const webhookUrl = process.env.WEBHOOK_URL || 'https://shadowspark-chatbot-production.up.railway.app/webhooks/whatsapp';

// Validate required environment variables
if (!accountSid || !authToken || !whatsappNumber) {
  console.error('❌ Error: Missing required environment variables');
  console.error('Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER');
  process.exit(1);
}

// Initialize Twilio client
const client = twilio(accountSid, authToken);

// Business profile data
const BUSINESS_PROFILE = {
  about: 'ShadowSpark Technologies - AI-Powered Business Automation Solutions in Port Harcourt, Rivers State. WhatsApp Chatbots, Auto-Responders & Process Automation.',
  address: 'Port Harcourt, Rivers State, Nigeria',
  description: 'We build AI-powered automation solutions for businesses: WhatsApp Chatbots (₦350k), Auto-Responders (₦150k), Lead Follow-Up Systems (₦250k), and Process Automation (₦100k/month).',
  email: 'info@shadowspark-tech.org',
  vertical: 'PROF_SERVICES',
  websites: ['https://shadowspark-tech.org'],
};

/**
 * Configure WhatsApp Business Profile
 */
async function setupBusinessProfile() {
  console.log('🚀 Setting up WhatsApp Business Profile...\n');

  try {
    // Note: Twilio's WhatsApp API has limited profile customization
    // Most profile settings are configured in the Twilio Console
    console.log('📋 Business Profile Configuration:');
    console.log('   Name: ShadowSpark Technologies');
    console.log('   About:', BUSINESS_PROFILE.about);
    console.log('   Location:', BUSINESS_PROFILE.address);
    console.log('   Website:', BUSINESS_PROFILE.websites[0]);
    console.log('   Email:', BUSINESS_PROFILE.email);
    console.log('   Category:', BUSINESS_PROFILE.vertical);
    
    console.log('\n⚠️  Note: Business profile details must be configured in Twilio Console:');
    console.log('   1. Go to https://console.twilio.com');
    console.log('   2. Navigate to Messaging > WhatsApp senders');
    console.log('   3. Select your WhatsApp number');
    console.log('   4. Update Business Profile with the above details\n');

    return true;
  } catch (error) {
    console.error('❌ Error setting up business profile:', error.message);
    return false;
  }
}

/**
 * Configure webhook URL
 */
async function setupWebhook() {
  console.log('🔗 Configuring webhook...\n');

  try {
    // Extract phone number from whatsapp: prefix if present
    const phoneNumber = whatsappNumber.replace('whatsapp:', '');
    
    console.log('   Webhook URL:', webhookUrl);
    console.log('   WhatsApp Number:', phoneNumber);
    
    // Get the incoming phone number configuration
    const phoneNumbers = await client.incomingPhoneNumbers.list({
      phoneNumber: phoneNumber,
      limit: 1,
    });

    if (phoneNumbers.length === 0) {
      console.log('\n⚠️  Phone number not found in Twilio account.');
      console.log('   For WhatsApp Sandbox, configure webhook in console:');
      console.log('   https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox');
      console.log('   Set "When a message comes in" to:', webhookUrl);
      return true;
    }

    // Update webhook URL
    await client.incomingPhoneNumbers(phoneNumbers[0].sid)
      .update({
        smsUrl: webhookUrl,
        smsMethod: 'POST',
      });

    console.log('✅ Webhook configured successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error configuring webhook:', error.message);
    console.log('\n   Manual configuration required:');
    console.log('   1. Go to https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox');
    console.log('   2. Set "When a message comes in" to:', webhookUrl);
    return false;
  }
}

/**
 * Test webhook connectivity
 */
async function testWebhook() {
  console.log('\n🧪 Testing webhook connectivity...\n');

  try {
    const https = require('https');
    const http = require('http');
    
    const url = new URL(webhookUrl);
    const protocol = url.protocol === 'https:' ? https : http;
    
    return new Promise((resolve) => {
      const req = protocol.get(webhookUrl.replace('/webhooks/whatsapp', '/health'), (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('✅ Webhook endpoint is reachable!');
            console.log('   Response:', data.substring(0, 100));
            resolve(true);
          } else {
            console.log('⚠️  Webhook returned status:', res.statusCode);
            resolve(false);
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('❌ Webhook is not reachable:', error.message);
        console.log('   Make sure your server is running and accessible');
        resolve(false);
      });
      
      req.setTimeout(5000, () => {
        console.error('❌ Webhook request timed out');
        req.destroy();
        resolve(false);
      });
    });
  } catch (error) {
    console.error('❌ Error testing webhook:', error.message);
    return false;
  }
}

/**
 * Display setup summary
 */
function displaySummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📱 WhatsApp Business Profile Setup Complete');
  console.log('='.repeat(60));
  console.log('\n✅ Next Steps:');
  console.log('   1. Verify business profile in Twilio Console');
  console.log('   2. Run: npm run setup:templates (to create message templates)');
  console.log('   3. Send a test message to your WhatsApp number');
  console.log('   4. Check logs to verify webhook is receiving messages\n');
  
  console.log('📞 Test your chatbot:');
  console.log('   Send "MENU" to:', whatsappNumber);
  console.log('\n🌐 Monitor your webhook:');
  console.log('   Health check:', webhookUrl.replace('/webhooks/whatsapp', '/health'));
  console.log('\n');
}

/**
 * Main execution
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔧 ShadowSpark Technologies - WhatsApp Profile Setup');
  console.log('='.repeat(60) + '\n');

  // Step 1: Setup business profile
  const profileSuccess = await setupBusinessProfile();
  
  // Step 2: Configure webhook
  const webhookSuccess = await setupWebhook();
  
  // Step 3: Test webhook connectivity
  const testSuccess = await testWebhook();
  
  // Display summary
  displaySummary();
  
  // Exit with appropriate code
  if (profileSuccess && webhookSuccess && testSuccess) {
    console.log('✅ All setup steps completed successfully!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Setup completed with warnings. Please review above messages.\n');
    process.exit(0);
  }
}

// Run the script
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

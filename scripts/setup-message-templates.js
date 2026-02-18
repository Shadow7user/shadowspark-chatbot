#!/usr/bin/env node
/**
 * ShadowSpark Technologies - Message Templates Setup
 * 
 * Creates 6 Twilio Content API message templates and submits them for Meta approval.
 * These templates enable structured, pre-approved messages for WhatsApp Business.
 */

require('dotenv').config();
const twilio = require('twilio');

// Load environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Validate required environment variables
if (!accountSid || !authToken) {
  console.error('❌ Error: Missing required environment variables');
  console.error('Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN');
  process.exit(1);
}

// Initialize Twilio client
const client = twilio(accountSid, authToken);

// Message templates for ShadowSpark Technologies
const MESSAGE_TEMPLATES = [
  {
    friendlyName: 'shadowspark_welcome',
    language: 'en',
    variables: {
      1: 'customer_name',
    },
    types: {
      'twilio/text': {
        body: 'Hello {{1}}! 👋 Welcome to ShadowSpark Technologies. We specialize in AI-powered business automation. How can we help you today?',
      },
    },
  },
  {
    friendlyName: 'shadowspark_followup',
    language: 'en',
    variables: {
      1: 'customer_name',
      2: 'days_since_inquiry',
    },
    types: {
      'twilio/text': {
        body: 'Hi {{1}}, it\'s been {{2}} days since we last spoke. We wanted to follow up on your interest in our AI automation solutions. Are you ready to take the next step?',
      },
    },
  },
  {
    friendlyName: 'shadowspark_consultation_reminder',
    language: 'en',
    variables: {
      1: 'customer_name',
      2: 'consultation_date',
      3: 'consultation_time',
    },
    types: {
      'twilio/text': {
        body: '📅 Reminder: Hi {{1}}, your consultation with ShadowSpark Technologies is scheduled for {{2}} at {{3}}. We\'re looking forward to discussing how we can automate your business processes!',
      },
    },
  },
  {
    friendlyName: 'shadowspark_quote_sent',
    language: 'en',
    variables: {
      1: 'customer_name',
      2: 'service_name',
      3: 'quote_amount',
    },
    types: {
      'twilio/text': {
        body: 'Hi {{1}}! 📋 Your quote for {{2}} is ready: {{3}}. This includes setup, training, and 30 days support. Reply YES to proceed or call us to discuss further.',
      },
    },
  },
  {
    friendlyName: 'shadowspark_project_update',
    language: 'en',
    variables: {
      1: 'customer_name',
      2: 'project_status',
      3: 'completion_percentage',
    },
    types: {
      'twilio/text': {
        body: '🚀 Project Update: Hi {{1}}, your automation project is {{2}} - {{3}}% complete. We\'re making great progress and will keep you updated at each milestone.',
      },
    },
  },
  {
    friendlyName: 'shadowspark_payment_confirmation',
    language: 'en',
    variables: {
      1: 'customer_name',
      2: 'amount',
      3: 'service_name',
    },
    types: {
      'twilio/text': {
        body: '✅ Payment Received: Thank you {{1}}! We\'ve received your payment of {{2}} for {{3}}. Our team will begin implementation immediately. You\'ll receive updates at each stage.',
      },
    },
  },
];

/**
 * Create a content template
 */
async function createTemplate(template) {
  try {
    console.log(`   Creating: ${template.friendlyName}...`);
    
    const content = await client.content.v1.contents.create({
      friendlyName: template.friendlyName,
      language: template.language,
      variables: template.variables,
      types: template.types,
    });

    console.log(`   ✅ Created: ${content.sid}`);
    return {
      success: true,
      sid: content.sid,
      friendlyName: template.friendlyName,
    };
  } catch (error) {
    // Check if template already exists
    if (error.code === 54208 || error.message.includes('already exists')) {
      console.log(`   ⚠️  Already exists: ${template.friendlyName}`);
      return {
        success: true,
        exists: true,
        friendlyName: template.friendlyName,
      };
    }
    
    console.error(`   ❌ Failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      friendlyName: template.friendlyName,
    };
  }
}

/**
 * List existing content templates
 */
async function listExistingTemplates() {
  try {
    const contents = await client.content.v1.contents.list({ limit: 50 });
    return contents.filter((c) => 
      c.friendlyName.startsWith('shadowspark_')
    );
  } catch (error) {
    console.error('   ❌ Error listing templates:', error.message);
    return [];
  }
}

/**
 * Display template information
 */
function displayTemplateInfo(template) {
  console.log(`\n   📝 ${template.friendlyName}`);
  console.log(`      Language: ${template.language}`);
  console.log(`      Variables: ${Object.values(template.variables).join(', ')}`);
  console.log(`      Body: ${template.types['twilio/text'].body.substring(0, 80)}...`);
}

/**
 * Display approval instructions
 */
function displayApprovalInstructions(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📋 Template Approval Process');
  console.log('='.repeat(60));
  
  console.log('\n⚠️  IMPORTANT: Templates must be approved by Meta before use.');
  console.log('\nApproval Steps:');
  console.log('1. Go to Twilio Console: https://console.twilio.com/');
  console.log('2. Navigate to Messaging > Content Editor');
  console.log('3. Find your ShadowSpark templates (shadowspark_*)');
  console.log('4. For each template:');
  console.log('   - Review the content');
  console.log('   - Click "Submit for Approval"');
  console.log('   - Wait for Meta approval (usually 1-2 hours)');
  
  console.log('\n📱 Template Usage (after approval):');
  console.log('   Use these Content SIDs in your code:\n');
  
  results.forEach((result) => {
    if (result.success && result.sid) {
      console.log(`   ${result.friendlyName}: ${result.sid}`);
    }
  });
  
  console.log('\n💡 Example Usage:');
  console.log(`
   await client.messages.create({
     contentSid: 'HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
     from: 'whatsapp:+14155238886',
     to: 'whatsapp:+2348012345678',
     contentVariables: JSON.stringify({
       1: 'John Doe',
       2: '3',
     }),
   });
  `);
}

/**
 * Display summary
 */
function displaySummary(results) {
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const existing = results.filter((r) => r.exists).length;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Setup Summary');
  console.log('='.repeat(60));
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ⚠️  Already Existed: ${existing}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('='.repeat(60));
  
  if (failed > 0) {
    console.log('\n⚠️  Some templates failed to create. Check errors above.');
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔧 ShadowSpark Technologies - Message Templates Setup');
  console.log('='.repeat(60) + '\n');

  // Step 1: List existing templates
  console.log('📋 Checking existing templates...\n');
  const existing = await listExistingTemplates();
  
  if (existing.length > 0) {
    console.log(`   Found ${existing.length} existing ShadowSpark template(s):`);
    existing.forEach((t) => console.log(`   - ${t.friendlyName} (${t.sid})`));
  } else {
    console.log('   No existing ShadowSpark templates found.');
  }

  // Step 2: Create new templates
  console.log('\n📝 Creating message templates...\n');
  
  const results = [];
  for (const template of MESSAGE_TEMPLATES) {
    displayTemplateInfo(template);
    const result = await createTemplate(template);
    results.push(result);
    console.log(''); // Empty line for readability
  }

  // Step 3: Display summary
  displaySummary(results);
  
  // Step 4: Display approval instructions
  displayApprovalInstructions(results);
  
  console.log('\n✅ Template creation complete!\n');
  console.log('📌 Next Steps:');
  console.log('   1. Submit templates for Meta approval (see instructions above)');
  console.log('   2. Wait for approval confirmation from Twilio');
  console.log('   3. Update your code with approved Content SIDs');
  console.log('   4. Test sending template messages\n');
}

// Run the script
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

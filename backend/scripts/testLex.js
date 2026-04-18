require('dotenv').config();
const lexService = require('../services/lexService');

async function testLexIntegration() {
  console.log('🧪 Testing Amazon Lex v2 Integration...\n');

  // Check environment variables
  console.log('📋 Environment Check:');
  console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing');
  console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Missing');
  console.log('AWS_REGION:', process.env.AWS_REGION || 'us-east-1');
  console.log('LEX_BOT_ID:', process.env.LEX_BOT_ID || '❌ Missing');
  console.log('LEX_BOT_ALIAS_ID:', process.env.LEX_BOT_ALIAS_ID || 'TSTALIASID');
  console.log('LEX_LOCALE_ID:', process.env.LEX_LOCALE_ID || 'en_US');
  console.log('');

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.LEX_BOT_ID) {
    console.log('❌ Missing required environment variables.');
    console.log('💡 Run the setup script first: node setup-lex-automation.js');
    return;
  }

  // Test messages
  const testMessages = [
    'Show me my ITR for 2025-26',
    'List all my documents',
    'What\'s pending?',
    'Contact consultant',
    'Hi',
    'Menu',
    'I need my GST documents',
    'Status of my audit report'
  ];

  console.log('🚀 Testing Lex Recognition:\n');

  for (const message of testMessages) {
    try {
      console.log(`📝 Testing: "${message}"`);
      const response = await lexService.recognizeText(message, 'test-session-123');
      
      console.log(`   Intent: ${response.intent || 'None'}`);
      console.log(`   Slots: ${JSON.stringify(response.slots)}`);
      
      if (response.interpretations && response.interpretations.length > 0) {
        const confidence = lexService.getIntentConfidence(response.interpretations, response.intent);
        console.log(`   Confidence: ${(confidence * 100).toFixed(1)}%`);
      }
      
      console.log('   ✅ Success\n');
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  }

  console.log('🎉 Lex integration test completed!');
  console.log('\n📱 Ready for WhatsApp integration!');
  console.log('Update Twilio webhook to: /api/lex-webhook');
}

// Run the test
testLexIntegration().catch(console.error);
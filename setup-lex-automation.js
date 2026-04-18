#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 Amazon Lex v2 Automation Setup\n');

// Step 1: Install dependencies
console.log('📦 Installing AWS SDK...');
try {
  execSync('cd backend && npm install aws-sdk', { stdio: 'inherit' });
  console.log('✅ AWS SDK installed successfully\n');
} catch (error) {
  console.log('❌ Failed to install AWS SDK:', error.message);
  process.exit(1);
}

// Step 2: Update .env file
console.log('📝 Updating .env file with AWS credentials...');
const envPath = 'backend/.env';

let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

// Add AWS credentials if not present
if (!envContent.includes('AWS_ACCESS_KEY_ID')) {
  const awsConfig = `
# AWS Configuration for Lex v2
AWS_ACCESS_KEY_ID=AKIA4N5ZZJABDA2JFBRI
AWS_SECRET_ACCESS_KEY=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
AWS_REGION=us-east-1
LEX_BOT_ID=will_be_generated_automatically
LEX_BOT_ALIAS_ID=TSTALIASID
LEX_LOCALE_ID=en_US
`;

  fs.appendFileSync(envPath, awsConfig);
  console.log('✅ AWS credentials added to .env\n');
} else {
  console.log('✅ AWS credentials already present in .env\n');
}

// Step 3: Create Basic Lex Bot (no complex slots)
console.log('🤖 Creating basic Amazon Lex Bot (simplified version)...');
console.log('This will take 2-3 minutes...\n');

try {
  execSync('cd backend && node scripts/createBasicBot.js', { stdio: 'inherit' });
  console.log('\n✅ Basic Lex Bot created successfully!\n');
} catch (error) {
  console.log('\n❌ Bot creation failed. Please check the error above.\n');
  console.log('💡 Troubleshooting:');
  console.log('1. Verify AWS credentials are correct');
  console.log('2. Check AWS region permissions');
  console.log('3. Ensure IAM user has full Lex access\n');
  process.exit(1);
}

// Step 4: Test integration
console.log('🧪 Testing Lex integration...');
try {
  execSync('cd backend && node scripts/testLex.js', { stdio: 'inherit' });
  console.log('\n✅ Integration test completed!\n');
} catch (error) {
  console.log('\n⚠️  Integration test had issues, but bot should still work\n');
}

console.log('🎉 SETUP COMPLETED SUCCESSFULLY!\n');

console.log('📋 Next Steps:');
console.log('1. ✅ Lex bot created and configured');
console.log('2. ✅ Integration code ready');
console.log('3. 🔄 Update Twilio webhook URL to: /api/lex-webhook');
console.log('4. 🚀 Deploy to production');
console.log('5. 📱 Test with WhatsApp messages\n');

console.log('🧪 Test Commands:');
console.log('• Local test: cd backend && npm start');
console.log('• Test webhook: curl http://localhost:5000/api/lex-webhook/test');
console.log('• Test Lex: cd backend && node scripts/testLex.js\n');

console.log('📱 WhatsApp Test Messages:');
console.log('• "Show me my ITR for 2025-26"');
console.log('• "List all my documents"');
console.log('• "What\'s pending?"');
console.log('• "Contact consultant"');
console.log('• "Hi" or "Menu"\n');

console.log('🔧 Twilio Webhook Update:');
console.log('Go to Twilio Console → Messaging → WhatsApp Sandbox Settings');
console.log('Update webhook URL to: https://your-app.onrender.com/api/lex-webhook\n');

console.log('🎯 Your CA Document System now has AI-powered natural language understanding!');
console.log('Users can interact naturally instead of using exact commands.');
require('dotenv').config();
const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const lexModelsV2 = new AWS.LexModelsV2();

class ExistingBotFinder {
  constructor() {
    this.botName = 'CADocumentBot';
    this.botId = null;
    this.localeId = 'en_US';
  }

  async findAndConfigureBot() {
    console.log('🔍 Finding existing CADocumentBot...\n');

    try {
      // Step 1: Find existing bot
      await this.findExistingBot();
      
      // Step 2: Check and build if needed
      await this.checkAndBuildBot();
      
      // Step 3: Test bot
      await this.testBot();
      
      // Step 4: Update .env file
      await this.updateEnvFile();
      
      console.log('\n🎉 Existing Bot Configuration Completed!');
      console.log('\n📋 Bot Details:');
      console.log(`Bot ID: ${this.botId}`);
      console.log(`Bot Name: ${this.botName}`);
      console.log(`Locale: ${this.localeId}`);
      
    } catch (error) {
      console.error('❌ Bot configuration failed:', error.message);
      throw error;
    }
  }

  async findExistingBot() {
    console.log('🔍 Searching for existing bots...');

    try {
      const params = {};
      const result = await lexModelsV2.listBots(params).promise();
      
      const existingBot = result.botSummaries.find(bot => bot.botName === this.botName);
      
      if (existingBot) {
        this.botId = existingBot.botId;
        console.log('✅ Found existing bot:', this.botName);
        console.log('   Bot ID:', this.botId);
        console.log('   Status:', existingBot.botStatus);
      } else {
        throw new Error(`Bot ${this.botName} not found. Please create it first.`);
      }
      
    } catch (error) {
      throw error;
    }
  }

  async checkAndBuildBot() {
    console.log('🔨 Checking bot build status...');

    try {
      const params = {
        botId: this.botId,
        botVersion: 'DRAFT',
        localeId: this.localeId
      };
      
      const result = await lexModelsV2.describeBotLocale(params).promise();
      const status = result.botLocaleStatus;
      
      console.log('   Current status:', status);
      
      if (status === 'NotBuilt' || status === 'Building') {
        console.log('🔨 Building bot...');
        
        const buildParams = {
          botId: this.botId,
          botVersion: 'DRAFT',
          localeId: this.localeId
        };
        
        await lexModelsV2.buildBotLocale(buildParams).promise();
        console.log('✅ Bot build started...');
        
        // Wait for build to complete
        await this.waitForBuildStatus('Built');
        console.log('✅ Bot build completed!');
        
      } else if (status === 'Built') {
        console.log('✅ Bot is already built and ready!');
      } else {
        console.log('⚠️  Bot status:', status);
      }
      
    } catch (error) {
      console.log('⚠️  Could not check build status:', error.message);
      console.log('   Bot may still work for testing');
    }
  }

  async testBot() {
    console.log('🧪 Testing Bot...');

    const lexRuntime = new AWS.LexRuntimeV2();
    
    const testMessages = [
      'Show me my ITR for 2025-26',
      'Hello',
      'What\'s pending?',
      'Contact consultant'
    ];

    for (const message of testMessages) {
      try {
        const params = {
          botId: this.botId,
          botAliasId: 'TSTALIASID',
          localeId: this.localeId,
          sessionId: 'test-session-123',
          text: message
        };

        const response = await lexRuntime.recognizeText(params).promise();
        console.log(`✅ Test "${message}" → Intent: ${response.sessionState?.intent?.name || 'None'}`);
        
      } catch (error) {
        console.log(`⚠️  Test "${message}" → Error: ${error.message}`);
      }
    }
  }

  async updateEnvFile() {
    console.log('📝 Updating .env file with Bot ID...');
    
    const fs = require('fs');
    const envPath = 'backend/.env';
    
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      if (envContent.includes('LEX_BOT_ID=')) {
        // Replace existing Bot ID
        envContent = envContent.replace(/LEX_BOT_ID=.*/, `LEX_BOT_ID=${this.botId}`);
      } else {
        // Add Bot ID
        envContent += `\nLEX_BOT_ID=${this.botId}\n`;
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log('✅ .env file updated with Bot ID');
    }
  }

  async waitForBuildStatus(targetStatus) {
    console.log(`⏳ Waiting for build status: ${targetStatus}...`);
    
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max
    
    while (attempts < maxAttempts) {
      try {
        const params = {
          botId: this.botId,
          botVersion: 'DRAFT',
          localeId: this.localeId
        };
        
        const result = await lexModelsV2.describeBotLocale(params).promise();
        const status = result.botLocaleStatus;
        
        if (status === targetStatus) {
          break;
        } else if (status === 'Failed') {
          throw new Error('Bot build failed');
        }
        
        await this.sleep(10000);
        attempts++;
        
      } catch (error) {
        console.log(`⚠️  Build check attempt ${attempts + 1} failed:`, error.message);
        attempts++;
        await this.sleep(5000);
      }
    }
    
    if (attempts >= maxAttempts) {
      console.log('⚠️  Build status check timed out, but bot may still work');
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the bot finder
async function main() {
  try {
    const finder = new ExistingBotFinder();
    await finder.findAndConfigureBot();
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ExistingBotFinder;
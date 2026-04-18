require('dotenv').config();
const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const lexModelsV2 = new AWS.LexModelsV2();

class BasicLexBotCreator {
  constructor() {
    this.botName = `CADocumentBot-${Date.now()}`;
    this.description = 'CA Document System WhatsApp Bot - Basic Version';
    this.botId = null;
    this.localeId = 'en_US';
  }

  async createBot() {
    console.log('🚀 Creating Basic Amazon Lex v2 Bot...\n');

    try {
      // Step 1: Create Bot
      await this.createLexBot();
      
      // Step 2: Create Basic Intents (no slots)
      await this.createBasicIntents();
      
      // Step 3: Build Bot
      await this.buildBot();
      
      // Step 4: Test Bot
      await this.testBot();
      
      // Step 5: Update .env file
      await this.updateEnvFile();
      
      console.log('\n🎉 Basic Bot Creation Completed Successfully!');
      console.log('\n📋 Bot Details:');
      console.log(`Bot ID: ${this.botId}`);
      console.log(`Bot Name: ${this.botName}`);
      
    } catch (error) {
      console.error('❌ Bot creation failed:', error.message);
      throw error;
    }
  }

  async createLexBot() {
    console.log('🤖 Creating Lex Bot...');

    // Get account ID for role ARN
    const sts = new AWS.STS();
    const identity = await sts.getCallerIdentity().promise();
    const accountId = identity.Account;
    
    const roleArn = `arn:aws:iam::${accountId}:role/aws-service-role/lexv2.amazonaws.com/AWSServiceRoleForLexV2Bots`;

    const params = {
      botName: this.botName,
      description: this.description,
      roleArn: roleArn,
      dataPrivacy: {
        childDirected: false
      },
      idleSessionTTLInSeconds: 300
    };

    try {
      const result = await lexModelsV2.createBot(params).promise();
      this.botId = result.botId;
      console.log('✅ Bot created with ID:', this.botId);
      
      await this.waitForBotStatus('Available');
      await this.createBotLocale();
      
    } catch (error) {
      throw error;
    }
  }

  async createBotLocale() {
    console.log('🌐 Creating Bot Locale...');

    const params = {
      botId: this.botId,
      botVersion: 'DRAFT',
      localeId: this.localeId,
      description: 'English locale for CA Document Bot',
      nluIntentConfidenceThreshold: 0.40
    };

    try {
      await lexModelsV2.createBotLocale(params).promise();
      console.log('✅ Bot locale created');
      await this.waitForLocaleStatus('NotBuilt');
    } catch (error) {
      if (error.code !== 'ConflictException') {
        throw error;
      }
      console.log('✅ Bot locale already exists');
    }
  }

  async createBasicIntents() {
    console.log('🎯 Creating Basic Intents (no slots)...');

    const intents = [
      {
        intentName: 'Greeting',
        description: 'User greets the bot',
        sampleUtterances: [
          'Hi', 'Hello', 'Hey', 'Good morning', 'Good afternoon', 'Start', 'Begin', 'Namaste'
        ]
      },
      {
        intentName: 'ShowMenu',
        description: 'User wants to see menu options',
        sampleUtterances: [
          'Menu', 'Main menu', 'Options', 'Help', 'What can you do', 'Show options', 'Show menu'
        ]
      },
      {
        intentName: 'ContactConsultant',
        description: 'User wants consultant contact information',
        sampleUtterances: [
          'Contact consultant', 'Call CA', 'Phone number', 'How to contact', 'Consultant details', 'CA contact'
        ]
      },
      {
        intentName: 'CheckPendingRequests',
        description: 'User wants to check pending document requests',
        sampleUtterances: [
          'What\'s pending', 'Pending requests', 'Show pending', 'What\'s in progress', 'Status of my requests'
        ]
      },
      {
        intentName: 'GetDocument',
        description: 'User wants to get a document',
        sampleUtterances: [
          'Show me my documents', 'I need my documents', 'Get documents', 'My documents', 'Show documents'
        ]
      }
    ];

    for (const intent of intents) {
      try {
        const intentParams = {
          botId: this.botId,
          botVersion: 'DRAFT',
          localeId: this.localeId,
          intentName: intent.intentName,
          description: intent.description,
          sampleUtterances: intent.sampleUtterances.map(utterance => ({ utterance }))
        };

        await lexModelsV2.createIntent(intentParams).promise();
        console.log(`✅ Intent created: ${intent.intentName}`);

      } catch (error) {
        if (error.code !== 'ConflictException') {
          console.error(`❌ Failed to create intent ${intent.intentName}:`, error.message);
        } else {
          console.log(`✅ Intent already exists: ${intent.intentName}`);
        }
      }
    }
  }

  async buildBot() {
    console.log('🔨 Building Bot...');

    const params = {
      botId: this.botId,
      botVersion: 'DRAFT',
      localeId: this.localeId
    };

    try {
      await lexModelsV2.buildBotLocale(params).promise();
      console.log('✅ Bot build started...');
      
      await this.waitForBuildStatus('Built');
      console.log('✅ Bot build completed successfully!');
      
    } catch (error) {
      throw error;
    }
  }

  async testBot() {
    console.log('🧪 Testing Bot...');

    const lexRuntime = new AWS.LexRuntimeV2();
    
    const testMessages = [
      'Hello',
      'Menu',
      'Contact consultant',
      'What\'s pending',
      'Show me my documents'
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
        envContent = envContent.replace(/LEX_BOT_ID=.*/, `LEX_BOT_ID=${this.botId}`);
      } else {
        envContent += `\nLEX_BOT_ID=${this.botId}\n`;
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log('✅ .env file updated with Bot ID');
    }
  }

  async waitForBotStatus(targetStatus) {
    console.log(`⏳ Waiting for bot status: ${targetStatus}...`);
    
    while (true) {
      const params = { botId: this.botId };
      const result = await lexModelsV2.describeBot(params).promise();
      const status = result.botStatus;
      
      if (status === targetStatus) break;
      if (status === 'Failed') throw new Error('Bot creation failed');
      
      await this.sleep(5000);
    }
  }

  async waitForLocaleStatus(targetStatus) {
    console.log(`⏳ Waiting for locale status: ${targetStatus}...`);
    
    while (true) {
      const params = {
        botId: this.botId,
        botVersion: 'DRAFT',
        localeId: this.localeId
      };
      
      const result = await lexModelsV2.describeBotLocale(params).promise();
      const status = result.botLocaleStatus;
      
      if (status === targetStatus) break;
      if (status === 'Failed') throw new Error('Bot locale creation failed');
      
      await this.sleep(5000);
    }
  }

  async waitForBuildStatus(targetStatus) {
    console.log(`⏳ Waiting for build status: ${targetStatus}...`);
    
    let attempts = 0;
    const maxAttempts = 20;
    
    while (attempts < maxAttempts) {
      try {
        const params = {
          botId: this.botId,
          botVersion: 'DRAFT',
          localeId: this.localeId
        };
        
        const result = await lexModelsV2.describeBotLocale(params).promise();
        const status = result.botLocaleStatus;
        
        if (status === targetStatus) break;
        if (status === 'Failed') throw new Error('Bot build failed');
        
        await this.sleep(10000);
        attempts++;
        
      } catch (error) {
        console.log(`⚠️  Build check attempt ${attempts + 1}:`, error.message);
        attempts++;
        await this.sleep(5000);
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the bot creation
async function main() {
  try {
    const creator = new BasicLexBotCreator();
    await creator.createBot();
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = BasicLexBotCreator;
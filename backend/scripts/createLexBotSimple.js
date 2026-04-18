require('dotenv').config();
const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const lexModelsV2 = new AWS.LexModelsV2();

class SimpleLexBotCreator {
  constructor() {
    this.botName = `CADocumentBot-${Date.now()}`; // Unique name with timestamp
    this.description = 'CA Document System WhatsApp Bot for natural language document requests';
    this.botId = null;
    this.localeId = 'en_US';
  }

  async createBot() {
    console.log('🚀 Starting Simple Amazon Lex v2 Bot Creation...\n');

    try {
      // Step 1: Create Bot (without custom role)
      await this.createLexBot();
      
      // Step 2: Create Slot Types
      await this.createSlotTypes();
      
      // Step 3: Create Intents
      await this.createIntents();
      
      // Step 4: Build Bot
      await this.buildBot();
      
      // Step 5: Test Bot
      await this.testBot();
      
      console.log('\n🎉 Bot Creation Completed Successfully!');
      console.log('\n📋 Add this to your .env file:');
      console.log(`LEX_BOT_ID=${this.botId}`);
      
      // Update .env file automatically
      await this.updateEnvFile();
      
    } catch (error) {
      console.error('❌ Bot creation failed:', error.message);
      throw error;
    }
  }

  async createLexBot() {
    console.log('🤖 Creating Lex Bot...');

    // First, get account ID for role ARN
    const sts = new AWS.STS();
    const identity = await sts.getCallerIdentity().promise();
    const accountId = identity.Account;
    
    // Use the default Lex service role
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
      
      // Wait for bot to be available
      await this.waitForBotStatus('Available');
      
      // Now create the locale
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
      
      // Wait for locale to be available
      await this.waitForLocaleStatus('NotBuilt');
      
    } catch (error) {
      if (error.code !== 'ConflictException') {
        throw error;
      }
      console.log('✅ Bot locale already exists');
    }
  }

  async createSlotTypes() {
    console.log('📝 Creating Slot Types...');

    const slotTypeParams = {
      botId: this.botId,
      botVersion: 'DRAFT',
      localeId: this.localeId,
      slotTypeName: 'DocumentTypes',
      description: 'Types of documents available in CA system',
      valueSelectionSetting: {
        resolutionStrategy: 'OriginalValue'
      },
      slotTypeValues: [
        { sampleValue: { value: 'ITR' }, synonyms: [{ value: 'Income Tax Return' }, { value: 'Tax Return' }] },
        { sampleValue: { value: 'GST' }, synonyms: [{ value: 'GST Return' }, { value: 'GSTR' }] },
        { sampleValue: { value: 'TDS' }, synonyms: [{ value: 'TDS Certificate' }, { value: 'Tax Deduction' }] },
        { sampleValue: { value: 'Audit Report' }, synonyms: [{ value: 'Audit' }] },
        { sampleValue: { value: 'Balance Sheet' }, synonyms: [{ value: 'Financial Statement' }] }
      ]
    };

    try {
      await lexModelsV2.createSlotType(slotTypeParams).promise();
      console.log('✅ DocumentTypes slot type created');
    } catch (error) {
      if (error.code !== 'ConflictException') {
        throw error;
      }
      console.log('✅ DocumentTypes slot type already exists');
    }
  }

  async createIntents() {
    console.log('🎯 Creating Intents...');

    const intents = [
      {
        intentName: 'GetDocument',
        description: 'User wants to retrieve a specific document',
        sampleUtterances: [
          'Show me my {DocumentType} for {Year}',
          'I need my {DocumentType} {Year}',
          'Get {DocumentType} {Year}',
          '{DocumentType} for {Year}',
          'Can I get my {DocumentType} for {Year}',
          'Where is my {DocumentType} {Year}',
          'Send me {DocumentType} {Year}',
          'I want {DocumentType} {Year}'
        ],
        slots: [
          {
            slotName: 'DocumentType',
            slotTypeName: 'DocumentTypes',
            required: true,
            prompt: 'Which document do you need? (ITR, GST, TDS, Audit Report, Balance Sheet)'
          },
          {
            slotName: 'Year',
            slotTypeName: 'AMAZON.AlphaNumeric',
            required: false,
            prompt: 'Which year do you need?'
          }
        ]
      },
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
          'Contact consultant', 'Call CA', 'Phone number', 'How to contact', 'Consultant details', 'CA contact', 'Contact my CA'
        ]
      },
      {
        intentName: 'CheckPendingRequests',
        description: 'User wants to check pending document requests',
        sampleUtterances: [
          'What\'s pending', 'Pending requests', 'Show pending', 'What\'s in progress', 'Status of my requests', 'Pending documents', 'Check status'
        ]
      }
    ];

    for (const intent of intents) {
      try {
        // Create intent
        const intentParams = {
          botId: this.botId,
          botVersion: 'DRAFT',
          localeId: this.localeId,
          intentName: intent.intentName,
          description: intent.description,
          sampleUtterances: intent.sampleUtterances.map(utterance => ({ utterance }))
        };

        const intentResult = await lexModelsV2.createIntent(intentParams).promise();
        console.log(`✅ Intent created: ${intent.intentName}`);

        // Create slots for this intent
        if (intent.slots) {
          for (let i = 0; i < intent.slots.length; i++) {
            const slot = intent.slots[i];
            const slotParams = {
              botId: this.botId,
              botVersion: 'DRAFT',
              localeId: this.localeId,
              intentId: intentResult.intentId,
              slotName: slot.slotName,
              slotTypeId: slot.slotTypeName,
              valueElicitationSetting: {
                slotConstraint: slot.required ? 'Required' : 'Optional',
                promptSpecification: {
                  messageGroups: [
                    {
                      message: {
                        plainTextMessage: {
                          value: slot.prompt
                        }
                      }
                    }
                  ],
                  maxRetries: 3
                }
              }
            };

            await lexModelsV2.createSlot(slotParams).promise();
            console.log(`  ✅ Slot created: ${slot.slotName}`);
          }
        }

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
      
      // Wait for build to complete
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
      
      if (status === targetStatus) {
        break;
      } else if (status === 'Failed') {
        throw new Error('Bot locale creation failed');
      }
      
      await this.sleep(5000);
    }
  }

  async waitForBotStatus(targetStatus) {
    console.log(`⏳ Waiting for bot status: ${targetStatus}...`);
    
    while (true) {
      const params = {
        botId: this.botId
      };
      
      const result = await lexModelsV2.describeBot(params).promise();
      const status = result.botStatus;
      
      if (status === targetStatus) {
        break;
      } else if (status === 'Failed') {
        throw new Error('Bot creation failed');
      }
      
      await this.sleep(5000);
    }
  }

  async waitForBuildStatus(targetStatus) {
    console.log(`⏳ Waiting for build status: ${targetStatus}...`);
    
    while (true) {
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
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the bot creation
async function main() {
  try {
    const creator = new SimpleLexBotCreator();
    await creator.createBot();
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = SimpleLexBotCreator;
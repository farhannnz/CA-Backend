require('dotenv').config();
const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
});

const lexModelsV2 = new AWS.LexModelsV2();

class LexBotCreator {
    constructor() {
        this.botName = 'CADocumentBot';
        this.description = 'CA Document System WhatsApp Bot for natural language document requests';
        this.roleArn = null;
        this.botId = null;
        this.localeId = 'en_US';
    }

    async createBot() {
        console.log('🚀 Starting Amazon Lex v2 Bot Creation...\n');

        try {
            // Step 1: Create IAM Role for Lex
            await this.createLexServiceRole();

            // Step 2: Create Bot
            await this.createLexBot();

            // Step 3: Create Slot Types
            await this.createSlotTypes();

            // Step 4: Create Intents
            await this.createIntents();

            // Step 5: Build Bot
            await this.buildBot();

            // Step 6: Test Bot
            await this.testBot();

            console.log('\n🎉 Bot Creation Completed Successfully!');
            console.log('\n📋 Add these to your .env file:');
            console.log(`LEX_BOT_ID=${this.botId}`);
            console.log(`LEX_BOT_ALIAS_ID=TSTALIASID`);
            console.log(`LEX_LOCALE_ID=${this.localeId}`);

        } catch (error) {
            console.error('❌ Bot creation failed:', error.message);
            throw error;
        }
    }

    async createLexServiceRole() {
        console.log('🔑 Creating IAM Role for Lex...');

        const iam = new AWS.IAM();

        const trustPolicy = {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Principal: {
                        Service: 'lexv2.amazonaws.com'
                    },
                    Action: 'sts:AssumeRole'
                }
            ]
        };

        try {
            // Create role
            const roleParams = {
                RoleName: 'LexV2-CADocumentBot-Role',
                AssumeRolePolicyDocument: JSON.stringify(trustPolicy),
                Description: 'Service role for CA Document Bot'
            };

            const roleResult = await iam.createRole(roleParams).promise();
            this.roleArn = roleResult.Role.Arn;

            // Attach policy
            await iam.attachRolePolicy({
                RoleName: 'LexV2-CADocumentBot-Role',
                PolicyArn: 'arn:aws:iam::aws:policy/AmazonLexBotPolicy'
            }).promise();

            console.log('✅ IAM Role created:', this.roleArn);

            // Wait for role to propagate
            await this.sleep(10000);

        } catch (error) {
            if (error.code === 'EntityAlreadyExists') {
                // Role already exists, get its ARN
                const existingRole = await iam.getRole({
                    RoleName: 'LexV2-CADocumentBot-Role'
                }).promise();
                this.roleArn = existingRole.Role.Arn;
                console.log('✅ Using existing IAM Role:', this.roleArn);
            } else {
                throw error;
            }
        }
    }

    async createLexBot() {
        console.log('🤖 Creating Lex Bot...');

        const params = {
            botName: this.botName,
            description: this.description,
            roleArn: this.roleArn,
            dataPrivacy: {
                childDirected: false
            },
            idleSessionTTLInSeconds: 300,
            botLocales: [
                {
                    localeId: this.localeId,
                    description: 'English locale for CA Document Bot',
                    nluIntentConfidenceThreshold: 0.40,
                    voiceSettings: {
                        voiceId: 'Ivy'
                    }
                }
            ]
        };

        try {
            const result = await lexModelsV2.createBot(params).promise();
            this.botId = result.botId;
            console.log('✅ Bot created with ID:', this.botId);

            // Wait for bot to be available
            await this.waitForBotStatus('Available');

        } catch (error) {
            throw error;
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
            slotTypeValues: [
                { sampleValue: { value: 'ITR' }, synonyms: [{ value: 'Income Tax Return' }, { value: 'Tax Return' }] },
                { sampleValue: { value: 'GST' }, synonyms: [{ value: 'GST Return' }, { value: 'GSTR' }] },
                { sampleValue: { value: 'TDS' }, synonyms: [{ value: 'TDS Certificate' }, { value: 'Tax Deduction' }] },
                { sampleValue: { value: 'Audit Report' }, synonyms: [{ value: 'Audit' }] },
                { sampleValue: { value: 'Balance Sheet' }, synonyms: [{ value: 'Financial Statement' }] }
            ],
            valueSelectionStrategy: 'ORIGINAL_VALUE'
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
                    { utterance: 'Show me my {DocumentType} for {Year}' },
                    { utterance: 'I need my {DocumentType} {Year}' },
                    { utterance: 'Get {DocumentType} {Year}' },
                    { utterance: '{DocumentType} for {Year}' },
                    { utterance: 'Can I get my {DocumentType} for {Year}' },
                    { utterance: 'Where is my {DocumentType} {Year}' },
                    { utterance: 'Send me {DocumentType} {Year}' },
                    { utterance: 'I want {DocumentType} {Year}' }
                ],
                slots: [
                    {
                        slotName: 'DocumentType',
                        description: 'Type of document requested',
                        slotTypeName: 'DocumentTypes',
                        valueElicitationSetting: {
                            slotConstraint: 'Required',
                            promptSpecification: {
                                messageGroupsList: [
                                    {
                                        message: {
                                            plainTextMessage: {
                                                value: 'Which document do you need? (ITR, GST, TDS, Audit Report, Balance Sheet)'
                                            }
                                        }
                                    }
                                ],
                                maxRetries: 3
                            }
                        }
                    },
                    {
                        slotName: 'Year',
                        description: 'Year of the document',
                        slotTypeName: 'AMAZON.AlphaNumeric',
                        valueElicitationSetting: {
                            slotConstraint: 'Optional',
                            promptSpecification: {
                                messageGroupsList: [
                                    {
                                        message: {
                                            plainTextMessage: {
                                                value: 'Which year do you need?'
                                            }
                                        }
                                    }
                                ],
                                maxRetries: 2
                            }
                        }
                    }
                ],
                intentClosingSetting: {
                    closingResponse: {
                        messageGroupsList: [
                            {
                                message: {
                                    plainTextMessage: {
                                        value: 'Let me find that document for you.'
                                    }
                                }
                            }
                        ]
                    }
                }
            },
            {
                intentName: 'Greeting',
                description: 'User greets the bot',
                sampleUtterances: [
                    { utterance: 'Hi' },
                    { utterance: 'Hello' },
                    { utterance: 'Hey' },
                    { utterance: 'Good morning' },
                    { utterance: 'Good afternoon' },
                    { utterance: 'Start' },
                    { utterance: 'Begin' },
                    { utterance: 'Namaste' }
                ],
                intentClosingSetting: {
                    closingResponse: {
                        messageGroupsList: [
                            {
                                message: {
                                    plainTextMessage: {
                                        value: 'Hello! Welcome to your CA Document Portal. How can I help you today?'
                                    }
                                }
                            }
                        ]
                    }
                }
            },
            {
                intentName: 'ShowMenu',
                description: 'User wants to see menu options',
                sampleUtterances: [
                    { utterance: 'Menu' },
                    { utterance: 'Main menu' },
                    { utterance: 'Options' },
                    { utterance: 'Help' },
                    { utterance: 'What can you do' },
                    { utterance: 'Show options' },
                    { utterance: 'Show menu' }
                ],
                intentClosingSetting: {
                    closingResponse: {
                        messageGroupsList: [
                            {
                                message: {
                                    plainTextMessage: {
                                        value: 'Here are your options: 1️⃣ Contact Consultant 2️⃣ Issued Documents 3️⃣ Pending Requests'
                                    }
                                }
                            }
                        ]
                    }
                }
            },
            {
                intentName: 'ContactConsultant',
                description: 'User wants consultant contact information',
                sampleUtterances: [
                    { utterance: 'Contact consultant' },
                    { utterance: 'Call CA' },
                    { utterance: 'Phone number' },
                    { utterance: 'How to contact' },
                    { utterance: 'Consultant details' },
                    { utterance: 'CA contact' },
                    { utterance: 'Contact my CA' }
                ],
                intentClosingSetting: {
                    closingResponse: {
                        messageGroupsList: [
                            {
                                message: {
                                    plainTextMessage: {
                                        value: 'Here are your consultant details.'
                                    }
                                }
                            }
                        ]
                    }
                }
            },
            {
                intentName: 'CheckPendingRequests',
                description: 'User wants to check pending document requests',
                sampleUtterances: [
                    { utterance: 'What\'s pending' },
                    { utterance: 'Pending requests' },
                    { utterance: 'Show pending' },
                    { utterance: 'What\'s in progress' },
                    { utterance: 'Status of my requests' },
                    { utterance: 'Pending documents' },
                    { utterance: 'Check status' }
                ],
                intentClosingSetting: {
                    closingResponse: {
                        messageGroupsList: [
                            {
                                message: {
                                    plainTextMessage: {
                                        value: 'Let me check your pending requests.'
                                    }
                                }
                            }
                        ]
                    }
                }
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
                    sampleUtterances: intent.sampleUtterances,
                    intentClosingSetting: intent.intentClosingSetting
                };

                if (intent.slots) {
                    intentParams.slotPriorities = intent.slots.map((slot, index) => ({
                        priority: index + 1,
                        slotName: slot.slotName
                    }));
                }

                await lexModelsV2.createIntent(intentParams).promise();
                console.log(`✅ Intent created: ${intent.intentName}`);

                // Create slots for this intent
                if (intent.slots) {
                    for (const slot of intent.slots) {
                        const slotParams = {
                            botId: this.botId,
                            botVersion: 'DRAFT',
                            localeId: this.localeId,
                            intentId: intentParams.intentName,
                            slotName: slot.slotName,
                            description: slot.description,
                            slotTypeId: slot.slotTypeName,
                            valueElicitationSetting: slot.valueElicitationSetting
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
        const creator = new LexBotCreator();
        await creator.createBot();
    } catch (error) {
        console.error('❌ Script failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = LexBotCreator;
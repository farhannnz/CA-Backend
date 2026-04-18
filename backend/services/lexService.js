const AWS = require('aws-sdk');

class LexService {
  constructor() {
    // Configure AWS
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });

    this.lexClient = new AWS.LexRuntimeV2();
    this.botId = process.env.LEX_BOT_ID;
    this.botAliasId = process.env.LEX_BOT_ALIAS_ID || 'TSTALIASID';
    this.localeId = process.env.LEX_LOCALE_ID || 'en_US';
  }

  async recognizeText(message, sessionId) {
    try {
      const params = {
        botId: this.botId,
        botAliasId: this.botAliasId,
        localeId: this.localeId,
        sessionId: sessionId,
        text: message
      };

      console.log('🤖 Sending to Lex:', { message, sessionId });
      const response = await this.lexClient.recognizeText(params).promise();
      console.log('✅ Lex response:', {
        intent: response.sessionState?.intent?.name,
        slots: response.sessionState?.intent?.slots
      });

      return {
        intent: response.sessionState?.intent?.name,
        slots: response.sessionState?.intent?.slots || {},
        message: response.messages?.[0]?.content || '',
        sessionState: response.sessionState,
        interpretations: response.interpretations || []
      };
    } catch (error) {
      console.error('❌ Lex error:', error.message);
      throw error;
    }
  }

  // Helper method to extract slot values
  extractSlotValue(slots, slotName) {
    const slot = slots[slotName];
    if (!slot) return null;
    
    return slot.value?.interpretedValue || slot.value?.originalValue || null;
  }

  // Helper method to get intent confidence
  getIntentConfidence(interpretations, intentName) {
    const interpretation = interpretations.find(i => i.intent?.name === intentName);
    return interpretation?.nluConfidence?.score || 0;
  }

  // Check if Lex is properly configured
  isConfigured() {
    return !!(this.botId && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  }
}

module.exports = new LexService();
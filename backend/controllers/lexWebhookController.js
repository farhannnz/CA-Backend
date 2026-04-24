const twilio = require('twilio');
const Client = require('../models/Client');
const Document = require('../models/Document');
const PendingRequest = require('../models/PendingRequest');
const lexService = require('../services/lexService');

class LexWebhookController {
  async handleWhatsAppMessage(req, res) {
    try {
      const twiml = new twilio.twiml.MessagingResponse();

      // Extract message details
      const incomingMessage = req.body.Body?.trim();
      const fromNumber = req.body.From?.replace('whatsapp:', '');
      const sessionId = fromNumber; // Use phone number as session ID

      console.log('📱 Received message:', incomingMessage, 'from:', fromNumber);

      if (!incomingMessage || !fromNumber) {
        twiml.message('Invalid request');
        return res.type('text/xml').send(twiml.toString());
      }

      // Find client by WhatsApp number
      const client = await this.findClientByNumber(fromNumber);

      if (!client) {
        twiml.message('You are not registered. Please contact your CA.');
        return res.type('text/xml').send(twiml.toString());
      }

      let response;

      // Try Lex first if configured
      if (lexService.isConfigured()) {
        try {
          console.log('🤖 Processing with Lex...');
          const lexResponse = await lexService.recognizeText(incomingMessage, sessionId);
          response = await this.processLexResponse(lexResponse, client, incomingMessage);
        } catch (lexError) {
          console.error('⚠️  Lex processing failed, falling back to rule-based:', lexError.message);
          response = await this.processRuleBasedMessage(incomingMessage, client);
        }
      } else {
        console.log('📋 Lex not configured, using rule-based logic');
        response = await this.processRuleBasedMessage(incomingMessage, client);
      }

      twiml.message(response);
      return res.type('text/xml').send(twiml.toString());

    } catch (error) {
      console.error('❌ Webhook error:', error);
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message('An error occurred. Please try again later or reply "menu".');
      res.type('text/xml').send(twiml.toString());
    }
  }

  async processLexResponse(lexResponse, client, originalMessage) {
    const { intent, slots, message, sessionState, interpretations } = lexResponse;

    console.log('🎯 Processing intent:', intent, 'with confidence:',
      lexService.getIntentConfidence(interpretations, intent));

    // Check confidence threshold
    const confidence = lexService.getIntentConfidence(interpretations, intent);
    if (confidence < 0.6) {
      console.log('⚠️  Low confidence, falling back to rule-based');
      return await this.processRuleBasedMessage(originalMessage, client);
    }

    switch (intent) {
      case 'GetDocument':
        return await this.handleGetDocumentIntent(slots, client);

      case 'ShowMenu':
      case 'Greeting':
        return this.getMainMenu(client);

      case 'ContactConsultant':
        return this.getConsultantInfo(client);

      case 'CheckPendingRequests':
        return await this.getPendingRequests(client);

      default:
        console.log('🤷 Unknown intent, falling back to rule-based');
        return await this.processRuleBasedMessage(originalMessage, client);
    }
  }

  async handleGetDocumentIntent(slots, client) {
    const documentType = lexService.extractSlotValue(slots, 'DocumentType');
    const year = lexService.extractSlotValue(slots, 'Year');

    console.log('📄 Document request - Type:', documentType, 'Year:', year);

    if (!documentType) {
      return "Which document do you need? (e.g., ITR, GST, TDS, Audit Report)";
    }

    if (!year) {
      // Show available years for this document type
      const docs = await Document.find({
        clientId: client._id,
        documentType: documentType.toUpperCase()
      }).sort({ year: -1 });

      if (docs.length === 0) {
        // Show apology with consultant contact info
        const consultantPhone = client.consultantPhone || 'Not available';
        const consultantInfo = consultantPhone !== 'Not available' 
          ? `\n📞 Contact your CA: ${consultantPhone}\nCA: ${client.createdBy?.name || 'N/A'}`
          : `\n📞 Contact your CA: ${client.createdBy?.name || 'N/A'}`;

        return `❌ Sorry, no ${documentType} documents are available yet.

These documents may not be filed or uploaded yet.${consultantInfo}

You can contact your CA for more information.

Reply 'menu' to see other options.`;
      }

      let response = `📄 Available ${documentType} documents:\n\n`;
      docs.forEach((doc, idx) => {
        response += `${idx + 1}️⃣ ${doc.year}\n`;
      });
      response += `\nWhich year do you need?`;
      return response;
    }

    // Find specific document
    const document = await Document.findOne({
      clientId: client._id,
      documentType: documentType.toUpperCase(),
      year: year
    });

    if (!document) {
      // Show apology with consultant contact info
      const consultantPhone = client.consultantPhone || 'Not available';
      const consultantInfo = consultantPhone !== 'Not available' 
        ? `\n📞 Contact your CA: ${consultantPhone}\nCA: ${client.createdBy?.name || 'N/A'}`
        : `\n📞 Contact your CA: ${client.createdBy?.name || 'N/A'}`;

      return `❌ Sorry, ${documentType} for ${year} is not available yet.

This document may not be filed or uploaded yet.${consultantInfo}

You can contact your CA for more information.

Reply 'menu' to see available options.`;
    }

    return `📄 ${documentType} ${year}\n\n${document.fileUrl}\n\nReply 'menu' for main menu`;
  }

  getMainMenu(client) {
    return `Hello ${client.name}! 👋

Welcome to ${client.createdBy?.name || 'CA'} Document Portal

🤖 You can ask me naturally:
• "Show me my ITR for 2025-26"
• "List all my documents"
• "What's pending?"
• "Contact consultant"

📋 Or choose an option:
1️⃣ Contact Consultant
2️⃣ Issued Documents  
3️⃣ Pending Requests

Reply with the number (1, 2, or 3)`;
  }

  getConsultantInfo(client) {
    const consultantPhone = client.consultantPhone || 'Not available';
    return `📞 Contact Consultant

CA Name: ${client.createdBy?.name || 'N/A'}
Phone: ${consultantPhone}

You can call or WhatsApp on this number for any queries.

Reply 'menu' to go back to main menu.`;
  }

  async getPendingRequests(client) {
    const pendingRequests = await PendingRequest.find({
      clientId: client._id,
      status: { $in: ['PENDING', 'IN_PROGRESS'] }
    });

    if (pendingRequests.length === 0) {
      return `⏳ Pending Requests\n\nNo pending requests at the moment.\n\nReply 'menu' to go back.`;
    }

    let response = `⏳ Pending Requests\n\n`;
    pendingRequests.forEach((req, idx) => {
      const statusEmoji = req.status === 'IN_PROGRESS' ? '🔄' : '⏳';
      response += `${idx + 1}. ${statusEmoji} ${req.documentType} ${req.year}\n   Status: ${req.status}\n`;
      if (req.notes) {
        response += `   Note: ${req.notes}\n`;
      }
      response += `\n`;
    });

    response += `Reply 'menu' to go back.`;
    return response;
  }

  // Fallback to original rule-based processing
  async processRuleBasedMessage(incomingMessage, client) {
    const lowerMessage = incomingMessage.toLowerCase();

    // Main Menu
    if (lowerMessage === 'hi' || lowerMessage === 'hello' || lowerMessage === 'menu' || lowerMessage === 'help') {
      return this.getMainMenu(client);
    }

    // Option handlers
    if (lowerMessage === '1' || lowerMessage.includes('contact')) {
      return this.getConsultantInfo(client);
    }

    if (lowerMessage === '2' || lowerMessage.includes('issued') || lowerMessage.includes('documents')) {
      return await this.getIssuedDocuments(client);
    }

    if (lowerMessage === '3' || lowerMessage.includes('pending')) {
      return await this.getPendingRequests(client);
    }

    // Document type selection
    const documentTypes = ['ITR', 'GST', 'TDS', 'AUDIT', 'BALANCE SHEET', 'AUDIT REPORT'];
    const matchedType = documentTypes.find(type => lowerMessage.includes(type.toLowerCase()));

    if (matchedType) {
      return await this.getDocumentsByType(matchedType, client);
    }

    // Direct document request: "ITR 2025-26"
    const messageParts = incomingMessage.split(/\s+/);
    if (messageParts.length >= 2) {
      const documentType = messageParts[0].toUpperCase();
      const year = messageParts[1];

      const document = await Document.findOne({
        clientId: client._id,
        documentType: documentType,
        year: year
      });

      if (!document) {
        const availableDocs = await Document.find({
          clientId: client._id,
          documentType: documentType
        });

        if (availableDocs.length > 0) {
          let response = `${documentType} for ${year} not found.\n\nAvailable ${documentType} documents:\n\n`;
          availableDocs.forEach(doc => {
            response += `📄 ${doc.year}\n`;
          });
          response += `\nReply 'menu' to go back`;
          return response;
        } else {
          return `${documentType} for ${year} not filed yet.\n\nReply 'menu' to go back.`;
        }
      }

      return `📄 ${documentType} ${year}\n\n${document.fileUrl}\n\nReply 'menu' for main menu`;
    }

    return "I didn't understand that. Try asking:\n• 'Show my ITR 2025-26'\n• 'List my documents'\n• 'What's pending?'\n\nOr reply 'menu' to see options.";
  }

  async getIssuedDocuments(client) {
    const allDocs = await Document.find({ clientId: client._id });

    if (allDocs.length === 0) {
      return `📄 Your Documents\n\nYou don't have any documents yet.\n\nReply 'menu' to go back.`;
    }

    // Group documents by type
    const docsByType = {};
    allDocs.forEach(doc => {
      if (!docsByType[doc.documentType]) {
        docsByType[doc.documentType] = [];
      }
      docsByType[doc.documentType].push(doc);
    });

    let response = `📄 Your Documents\n\nSelect document type:\n\n`;
    let index = 1;
    Object.keys(docsByType).forEach(type => {
      response += `${index}️⃣ ${type} (${docsByType[type].length})\n`;
      index++;
    });

    response += `\nReply with document type name (e.g., ITR)\nReply 'menu' to go back`;
    return response;
  }

  async getDocumentsByType(documentType, client) {
    const docs = await Document.find({
      clientId: client._id,
      documentType: documentType.toUpperCase()
    }).sort({ year: -1 });

    if (docs.length === 0) {
      return `No ${documentType} documents found.\n\nReply 'menu' to go back.`;
    }

    let response = `📄 ${documentType} Documents\n\n`;
    docs.forEach((doc, idx) => {
      response += `${idx + 1}️⃣ ${doc.year}\n   ${doc.fileUrl}\n\n`;
    });
    response += `Click on link to download\nReply 'menu' to go back`;
    return response;
  }

  async findClientByNumber(fromNumber) {
    const escapedNumber = fromNumber.replace(/[+\-()]/g, '\\$&');
    return await Client.findOne({
      $or: [
        { whatsappNumber: fromNumber },
        { whatsappNumber: `+${fromNumber}` },
        { whatsappNumber: { $regex: escapedNumber, $options: 'i' } }
      ]
    }).populate('createdBy', 'name');
  }

  // Test endpoint
  testWebhook(req, res) {
    res.json({
      message: 'Lex-enhanced webhook is working',
      timestamp: new Date().toISOString(),
      lexConfigured: lexService.isConfigured(),
      botId: process.env.LEX_BOT_ID || 'Not configured'
    });
  }
}

module.exports = new LexWebhookController();
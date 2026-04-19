const twilio = require('twilio');
const Client = require('../models/Client');
const Document = require('../models/Document');

class NewSmartWebhookController {
  constructor() {
    // Store conversation context per user
    this.userContexts = new Map();
    
    // Bind methods to preserve 'this' context
    this.handleWhatsAppMessage = this.handleWhatsAppMessage.bind(this);
    this.testWebhook = this.testWebhook.bind(this);
  }

  async handleWhatsAppMessage(req, res) {
    try {
      const twiml = new twilio.twiml.MessagingResponse();

      // Extract message details
      const incomingMessage = req.body.Body?.trim();
      const fromNumber = req.body.From?.replace('whatsapp:', '');

      console.log('📱 Received message:', incomingMessage, 'from:', fromNumber);

      if (!incomingMessage || !fromNumber) {
        twiml.message('Invalid request');
        return res.type('text/xml').send(twiml.toString());
      }

      // Find client by WhatsApp number
      console.log('🔍 Looking for client with number:', fromNumber);
      const client = await this.findClientByNumber(fromNumber);
      console.log('👤 Client found:', client ? client.name : 'Not found');
      
      if (!client) {
        console.log('❌ Client not registered for number:', fromNumber);
        const helpMessage = `Hello! 👋

You are not registered in our system yet.

To get started:
1️⃣ Contact your CA
2️⃣ Ask them to add your WhatsApp number: ${fromNumber}
3️⃣ Then you can access your documents here

Your CA can add you through the dashboard at:
https://your-ca-dashboard.com

Need help? Contact your CA directly.`;
        
        twiml.message(helpMessage);
        return res.type('text/xml').send(twiml.toString());
      }

      // Process message with new flow
      const response = await this.processMessage(incomingMessage, client, fromNumber);
      twiml.message(response);
      
      return res.type('text/xml').send(twiml.toString());

    } catch (error) {
      console.error('❌ Webhook error:', error);
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message('An error occurred. Please try again or say "hi".');
      res.type('text/xml').send(twiml.toString());
    }
  }

  async processMessage(message, client, fromNumber) {
    const lowerMessage = message.toLowerCase().trim();
    const userContext = this.userContexts.get(fromNumber) || {};

    // Step 1: Greeting → "How can I help you?"
    if (this.isGreeting(lowerMessage)) {
      this.clearUserContext(fromNumber);
      return `Hello ${client.name}! 👋\n\nHow can I help you today?\n\nYou can ask for:\n• Document name (ITR, GST, TDS, etc.)\n• Specific year (2025-26, 2024-25)\n• Or both together`;
    }

    // Step 2: Handle number selections (1, 2, 3...)
    if (this.isNumberSelection(lowerMessage)) {
      return await this.handleNumberSelection(lowerMessage, client, fromNumber, userContext);
    }

    // Step 3: Extract document type and year from message
    const extracted = this.extractDocumentAndYear(lowerMessage);

    if (extracted.documentType && extracted.year) {
      // Both provided → Get specific document
      return await this.getSpecificDocument(extracted.documentType, extracted.year, client, fromNumber);
    }
    else if (extracted.documentType) {
      // Only document type → Show year options
      return await this.showYearOptions(extracted.documentType, client, fromNumber);
    }
    else if (extracted.year) {
      // Only year → Show all documents for that year
      return await this.showDocumentsForYear(extracted.year, client, fromNumber);
    }
    else {
      // Nothing understood → Show document type options
      return await this.showDocumentTypeOptions(client, fromNumber);
    }
  }

  // Check if greeting
  isGreeting(message) {
    const greetings = ['hi', 'hello', 'hey', 'namaste', 'good morning', 'good afternoon', 'start'];
    return greetings.some(greeting => message.includes(greeting));
  }

  // Check if number selection (1, 2, 3...)
  isNumberSelection(message) {
    return /^[1-9]$/.test(message);
  }

  // Extract document type and year
  extractDocumentAndYear(message) {
    const documentKeywords = {
      'ITR': ['itr', 'income tax', 'tax return', 'income tax return', 'return', 'tax filing', 'income tax filing'],
      'GST': ['gst', 'gst return', 'gstr', 'goods and services tax', 'sales tax', 'service tax'],
      'TDS': ['tds', 'tds certificate', 'tax deduction', 'tax deducted at source', 'deduction certificate'],
      'AUDIT': ['audit', 'audit report', 'auditing', 'audited report', 'audit certificate'],
      'BALANCE SHEET': ['balance sheet', 'balance', 'financial statement', 'financial report', 'accounts']
    };

    let documentType = null;
    let year = null;

    // Find document type (check for base type, will match TDS-JAN, GST-MAR etc.)
    for (const [docType, keywords] of Object.entries(documentKeywords)) {
      if (keywords.some(keyword => message.includes(keyword))) {
        documentType = docType;
        break;
      }
    }

    // Find year
    const yearMatch = message.match(/\b(20\d{2}[-\/]?\d{0,2}|\d{4}[-\/]\d{2})\b/);
    if (yearMatch) {
      year = yearMatch[0];
    }

    return { documentType, year };
  }

  // Get specific document (both type and year provided)
  async getSpecificDocument(documentType, year, client, fromNumber) {
    this.clearUserContext(fromNumber);
    
    const document = await Document.findOne({
      clientId: client._id,
      documentType: documentType,
      year: year
    });

    if (document) {
      return `📄 ${documentType} ${year}\n\n${document.fileUrl}\n\nNeed anything else? Say "hi" for help.`;
    } else {
      return `❌ ${documentType} for ${year} not found.\n\nSay "hi" to see what's available.`;
    }
  }

  // Show year options for a document type
  async showYearOptions(documentType, client, fromNumber) {
    // Search for documents that start with the document type (e.g., TDS, TDS-JAN, TDS-FEB)
    const documents = await Document.find({
      clientId: client._id,
      documentType: { $regex: `^${documentType}`, $options: 'i' }
    }).sort({ year: -1, documentType: 1 });

    if (documents.length === 0) {
      this.clearUserContext(fromNumber);
      return `❌ No ${documentType} documents found.\n\nSay "hi" to see what's available.`;
    }

    if (documents.length === 1) {
      // Only one document, send directly
      this.clearUserContext(fromNumber);
      return `📄 ${documents[0].documentType} ${documents[0].year}\n\n${documents[0].fileUrl}\n\nNeed anything else? Say "hi" for help.`;
    }

    // Multiple documents available - group by year and show options
    const groupedDocs = {};
    documents.forEach(doc => {
      const key = `${doc.year}-${doc.documentType}`;
      if (!groupedDocs[key]) {
        groupedDocs[key] = doc;
      }
    });

    const uniqueDocs = Object.values(groupedDocs);
    
    let response = `📄 ${documentType} Documents Available:\n\n`;
    uniqueDocs.forEach((doc, index) => {
      response += `${index + 1}️⃣ ${doc.documentType} ${doc.year}\n`;
    });
    response += `\nReply with number (1, 2, 3...) to get the document`;

    // Store context
    this.userContexts.set(fromNumber, {
      type: 'year_selection',
      documentType: documentType,
      documents: uniqueDocs
    });

    return response;
  }

  // Show all documents for a specific year
  async showDocumentsForYear(year, client, fromNumber) {
    this.clearUserContext(fromNumber);
    
    const documents = await Document.find({
      clientId: client._id,
      year: year
    }).sort({ documentType: 1 });

    if (documents.length === 0) {
      return `❌ No documents found for ${year}.\n\nSay "hi" to see what's available.`;
    }

    let response = `📄 Documents for ${year}:\n\n`;
    documents.forEach((doc, index) => {
      response += `${index + 1}️⃣ ${doc.documentType} - ${doc.fileUrl}\n`;
    });
    response += `\nClick links to download or say "hi" for help`;

    return response;
  }

  // Show document type options when nothing understood
  async showDocumentTypeOptions(client, fromNumber) {
    const allDocs = await Document.find({ clientId: client._id });
    
    if (allDocs.length === 0) {
      this.clearUserContext(fromNumber);
      return `❌ No documents available yet.\n\nContact your CA to upload documents.`;
    }

    // Get unique base document types (ITR, GST, TDS, etc.)
    const baseTypes = {};
    allDocs.forEach(doc => {
      // Extract base type (e.g., TDS from TDS-JAN)
      const baseType = doc.documentType.split('-')[0];
      if (!baseTypes[baseType]) {
        baseTypes[baseType] = 0;
      }
      baseTypes[baseType]++;
    });

    const docTypes = Object.keys(baseTypes);

    let response = `📋 Which document do you want?\n\n`;
    docTypes.forEach((type, index) => {
      response += `${index + 1}️⃣ ${type} (${baseTypes[type]} available)\n`;
    });
    response += `\nReply with number (1, 2, 3...) to select`;

    // Store context
    this.userContexts.set(fromNumber, {
      type: 'document_selection',
      docTypes: docTypes
    });

    return response;
  }

  // Handle number selections (1, 2, 3...)
  async handleNumberSelection(selection, client, fromNumber, userContext) {
    const selectedIndex = parseInt(selection) - 1;

    if (userContext.type === 'document_selection') {
      // User selecting document type
      const docTypes = userContext.docTypes;
      
      if (selectedIndex < 0 || selectedIndex >= docTypes.length) {
        return `❌ Invalid option. Please select 1-${docTypes.length}`;
      }

      const selectedDocType = docTypes[selectedIndex];
      return await this.showYearOptions(selectedDocType, client, fromNumber);
    }
    else if (userContext.type === 'year_selection') {
      // User selecting year
      const documents = userContext.documents;
      
      if (selectedIndex < 0 || selectedIndex >= documents.length) {
        return `❌ Invalid option. Please select 1-${documents.length}`;
      }

      const selectedDoc = documents[selectedIndex];
      this.clearUserContext(fromNumber);
      
      return `📄 ${selectedDoc.documentType} ${selectedDoc.year}\n\n${selectedDoc.fileUrl}\n\nNeed anything else? Say "hi" for help.`;
    }
    else {
      // No context, treat as new request
      return await this.showDocumentTypeOptions(client, fromNumber);
    }
  }

  // Clear user context
  clearUserContext(fromNumber) {
    this.userContexts.delete(fromNumber);
  }

  // Find client by number
  async findClientByNumber(fromNumber) {
    try {
      console.log('🔍 Searching for client with number:', fromNumber);
      
      // Try different number formats
      const searchNumbers = [
        fromNumber,
        `+${fromNumber}`,
        fromNumber.replace('+', ''),
        fromNumber.replace(/[^\d]/g, '') // Remove all non-digits
      ];
      
      console.log('🔍 Trying these number formats:', searchNumbers);
      
      for (const number of searchNumbers) {
        const client = await Client.findOne({
          whatsappNumber: { $regex: number.replace(/[+\-()]/g, '\\$&'), $options: 'i' }
        }).populate('createdBy', 'name');
        
        if (client) {
          console.log('✅ Client found:', client.name, 'with number:', client.whatsappNumber);
          return client;
        }
      }
      
      console.log('❌ No client found for any number format');
      return null;
      
    } catch (error) {
      console.error('❌ Error finding client:', error);
      return null;
    }
  }

  // Test endpoint
  testWebhook(req, res) {
    res.json({ 
      message: 'New smart conversational webhook is working',
      timestamp: new Date().toISOString(),
      flow: [
        '1. User says "hi" → How can I help you?',
        '2. Extract keywords → Document type and/or year',
        '3. If both → Direct document link',
        '4. If only doc type → Show year options',
        '5. If only year → Show all docs for year',
        '6. If nothing → Show document type options',
        '7. User selects number → Get document'
      ]
    });
  }
}

module.exports = new NewSmartWebhookController();
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
      return `Hello ${client.name}! 👋\n\nHow can I help you today?\n\nYou can ask for:\n• Document name (ITR, GST, TDS, etc.)\n• Specific year (2025-26, 2024-25)\n• Or both together\n• Say "contact" for consultant info`;
    }

    // Step 2: Handle contact requests
    if (this.isContactRequest(lowerMessage)) {
      return this.getConsultantInfo(client);
    }

    // Step 3: Handle number selections (1, 2, 3...)
    if (this.isNumberSelection(lowerMessage)) {
      return await this.handleNumberSelection(lowerMessage, client, fromNumber, userContext);
    }

    // Step 4: Extract document type and year from message
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

  // Check if contact request
  isContactRequest(message) {
    const contactKeywords = ['contact', 'call', 'phone', 'number', 'consultant', 'ca contact', 'reach', 'help'];
    return contactKeywords.some(keyword => message.includes(keyword));
  }

  // Get consultant information
  getConsultantInfo(client) {
    const consultantPhone = client.consultantPhone || 'Not available';
    return `📞 Contact Consultant

CA Name: ${client.createdBy?.name || 'N/A'}
Phone: ${consultantPhone}

You can call or WhatsApp on this number for any queries.

Say "hi" to go back to document search.`;
  }

  // Check if number selection (1, 2, 3...)
  isNumberSelection(message) {
    return /^[1-9]$/.test(message);
  }

  // Extract document type and year
  extractDocumentAndYear(message) {
    console.log('🔍 Extracting keywords from message:', message);

    const documentKeywords = {
      'ITR': ['itr', 'income tax', 'tax return', 'income tax return', 'return', 'tax filing', 'income tax filing'],
      'GST': ['gst', 'gst return', 'gstr', 'goods and services tax', 'sales tax', 'service tax'],
      'TDS': ['tds', 'tds certificate', 'tax deduction', 'tax deducted at source', 'deduction certificate'],
      'AUDIT': ['audit', 'audit report', 'auditing', 'audited report', 'audit certificate'],
      'BALANCE SHEET': ['balance sheet', 'balance', 'financial statement', 'financial report', 'accounts']
    };

    // Month mapping for GST/TDS documents
    const monthKeywords = {
      'JAN': ['jan', 'january'],
      'FEB': ['feb', 'february'],
      'MAR': ['mar', 'march'],
      'APR': ['apr', 'april'],
      'MAY': ['may'],
      'JUN': ['jun', 'june'],
      'JUL': ['jul', 'july'],
      'AUG': ['aug', 'august'],
      'SEP': ['sep', 'september'],
      'OCT': ['oct', 'october'],
      'NOV': ['nov', 'november'],
      'DEC': ['dec', 'december']
    };

    // Quarter mapping
    const quarterKeywords = {
      'Q1': ['q1', 'quarter 1', 'first quarter'],
      'Q2': ['q2', 'quarter 2', 'second quarter'],
      'Q3': ['q3', 'quarter 3', 'third quarter'],
      'Q4': ['q4', 'quarter 4', 'fourth quarter']
    };

    let documentType = null;
    let year = null;
    let month = null;
    let quarter = null;

    const lowerMessage = message.toLowerCase();

    // Find document type (check for base type, will match TDS-JAN, GST-MAR etc.)
    for (const [docType, keywords] of Object.entries(documentKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()))) {
        documentType = docType;
        console.log('✅ Found document type:', docType);
        break;
      }
    }

    // Find month if GST or TDS
    if (documentType === 'GST' || documentType === 'TDS') {
      for (const [monthCode, keywords] of Object.entries(monthKeywords)) {
        if (keywords.some(keyword => lowerMessage.includes(keyword))) {
          month = monthCode;
          console.log('✅ Found month:', monthCode);
          break;
        }
      }

      // Find quarter if no month found
      if (!month) {
        for (const [quarterCode, keywords] of Object.entries(quarterKeywords)) {
          if (keywords.some(keyword => lowerMessage.includes(keyword))) {
            quarter = quarterCode;
            console.log('✅ Found quarter:', quarterCode);
            break;
          }
        }
      }

      // If month or quarter found, append to document type
      if (month) {
        documentType = `${documentType}-${month}`;
        console.log('✅ Updated document type with month:', documentType);
      } else if (quarter) {
        documentType = `${documentType}-${quarter}`;
        console.log('✅ Updated document type with quarter:', documentType);
      }
    }

    // Find year with smart mapping
    const yearMatch = message.match(/\b(20\d{2}[-\/]?\d{0,2}|\d{4}[-\/]\d{2})\b/);
    if (yearMatch) {
      let extractedYear = yearMatch[0];
      
      // Smart year mapping: if user says just "2025", map to "2025-26"
      if (extractedYear === '2025') {
        year = '2025-26';
        console.log('✅ Mapped 2025 to 2025-26');
      } else if (extractedYear === '2024') {
        year = '2024-25';
        console.log('✅ Mapped 2024 to 2024-25');
      } else if (extractedYear === '2023') {
        year = '2023-24';
        console.log('✅ Mapped 2023 to 2023-24');
      } else if (extractedYear === '2022') {
        year = '2022-23';
        console.log('✅ Mapped 2022 to 2022-23');
      } else {
        year = extractedYear;
        console.log('✅ Found year:', year);
      }
    }

    console.log('📋 Extracted:', { documentType, year, month, quarter });
    return { documentType, year };
  }

  // Get specific document (both type and year provided)
  async getSpecificDocument(documentType, year, client, fromNumber) {
    this.clearUserContext(fromNumber);

    console.log('🔍 Searching for document:', { documentType, year, clientId: client._id });

    // Try exact match first
    let document = await Document.findOne({
      clientId: client._id,
      documentType: documentType,
      year: year
    });

    // If not found, try with regex for flexible matching
    if (!document) {
      document = await Document.findOne({
        clientId: client._id,
        documentType: { $regex: `^${documentType}`, $options: 'i' },
        year: year
      });
    }

    console.log('📄 Document found:', document ? `${document.documentType} ${document.year}` : 'Not found');

    if (document) {
      return `📄 ${document.documentType} ${document.year}\n\n${document.fileUrl}\n\nNeed anything else? Say "hi" for help.`;
    } else {
      // Show apology with consultant contact info
      const consultantPhone = client.consultantPhone || 'Not available';
      const consultantInfo = consultantPhone !== 'Not available' 
        ? `\n📞 Contact your CA: ${consultantPhone}\nCA: ${client.createdBy?.name || 'N/A'}`
        : `\n📞 Contact your CA: ${client.createdBy?.name || 'N/A'}`;

      return `❌ Sorry, ${documentType} for ${year} is not available yet.

This document may not be filed or uploaded yet.${consultantInfo}

You can contact your CA for more information about this document.

Say "hi" to search for other documents.`;
    }
  }

  // Show year options for a document type
  async showYearOptions(documentType, client, fromNumber) {
    // For GST/TDS without specific month/quarter, search for all variants
    let searchPattern;
    if (documentType === 'GST' || documentType === 'TDS') {
      // If user just says "GST" or "TDS", show all GST/TDS documents
      searchPattern = { $regex: `^${documentType}`, $options: 'i' };
    } else {
      // For other document types or specific GST-JAN, GST-Q1 etc., search exactly
      searchPattern = { $regex: `^${documentType}`, $options: 'i' };
    }

    const documents = await Document.find({
      clientId: client._id,
      documentType: searchPattern
    }).sort({ year: -1, documentType: 1 });

    if (documents.length === 0) {
      this.clearUserContext(fromNumber);
      
      // Show apology with consultant contact info
      const consultantPhone = client.consultantPhone || 'Not available';
      const consultantInfo = consultantPhone !== 'Not available' 
        ? `\n📞 Contact your CA: ${consultantPhone}\nCA: ${client.createdBy?.name || 'N/A'}`
        : `\n📞 Contact your CA: ${client.createdBy?.name || 'N/A'}`;

      return `❌ Sorry, no ${documentType} documents are available yet.

This document type may not be filed or uploaded yet.${consultantInfo}

You can contact your CA for more information.

Say "hi" to search for other documents.`;
    }

    if (documents.length === 1) {
      // Only one document, send directly
      this.clearUserContext(fromNumber);
      return `📄 ${documents[0].documentType} ${documents[0].year}\n\n${documents[0].fileUrl}\n\nNeed anything else? Say "hi" for help.`;
    }

    // Multiple documents available - group by year and document type
    const groupedDocs = {};
    documents.forEach(doc => {
      const key = `${doc.year}-${doc.documentType}`;
      if (!groupedDocs[key]) {
        groupedDocs[key] = doc;
      }
    });

    const uniqueDocs = Object.values(groupedDocs);

    // If user asked for GST/TDS without specific month, show all variants
    if ((documentType === 'GST' || documentType === 'TDS') && uniqueDocs.length > 1) {
      let response = `� ${dorcumentType} Documents Available:\n\n`;
      
      // Group by year first, then show document types
      const yearGroups = {};
      uniqueDocs.forEach(doc => {
        if (!yearGroups[doc.year]) {
          yearGroups[doc.year] = [];
        }
        yearGroups[doc.year].push(doc);
      });

      let index = 1;
      Object.keys(yearGroups).sort().reverse().forEach(year => {
        response += `📅 ${year}:\n`;
        yearGroups[year].forEach(doc => {
          response += `${index}️⃣ ${doc.documentType}\n`;
          index++;
        });
        response += '\n';
      });
      
      response += `Reply with number (1, 2, 3...) to get the document`;

      // Store context with all documents
      this.userContexts.set(fromNumber, {
        type: 'year_selection',
        documentType: documentType,
        documents: uniqueDocs
      });

      return response;
    } else {
      // Regular flow for other document types
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
  }

  // Show all documents for a specific year
  async showDocumentsForYear(year, client, fromNumber) {
    this.clearUserContext(fromNumber);

    const documents = await Document.find({
      clientId: client._id,
      year: year
    }).sort({ documentType: 1 });

    if (documents.length === 0) {
      // Show apology with consultant contact info
      const consultantPhone = client.consultantPhone || 'Not available';
      const consultantInfo = consultantPhone !== 'Not available' 
        ? `\n� ContactD your CA: ${consultantPhone}\nCA: ${client.createdBy?.name || 'N/A'}`
        : `\n📞 Contact your CA: ${client.createdBy?.name || 'N/A'}`;

      return `❌ Sorry, no documents are available for ${year} yet.

Documents for this year may not be filed or uploaded yet.${consultantInfo}

You can contact your CA for more information.

Say "hi" to search for other years.`;
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
      
      // Show apology with consultant contact info
      const consultantPhone = client.consultantPhone || 'Not available';
      const consultantInfo = consultantPhone !== 'Not available' 
        ? `\n📞 Contact your CA: ${consultantPhone}\nCA: ${client.createdBy?.name || 'N/A'}`
        : `\n📞 Contact your CA: ${client.createdBy?.name || 'N/A'}`;

      return `❌ Sorry, no documents are available yet.

Your documents may not be uploaded yet.${consultantInfo}

You can contact your CA to check on your document status.

Say "hi" when documents are available.`;
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
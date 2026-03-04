const twilio = require('twilio');
const Client = require('../models/Client');
const Document = require('../models/Document');
const PendingRequest = require('../models/PendingRequest');

// Twilio webhook handler
exports.handleWhatsAppMessage = async (req, res) => {
  try {
    const twiml = new twilio.twiml.MessagingResponse();

    // Extract message details
    const incomingMessage = req.body.Body?.trim();
    const fromNumber = req.body.From?.replace('whatsapp:', '');

    console.log('Received message:', incomingMessage, 'from:', fromNumber);

    if (!incomingMessage || !fromNumber) {
      twiml.message('Invalid request');
      return res.type('text/xml').send(twiml.toString());
    }

    // Find client by WhatsApp number
    const escapedNumber = fromNumber.replace(/[+\-()]/g, '\\$&');
    const client = await Client.findOne({
      $or: [
        { whatsappNumber: fromNumber },
        { whatsappNumber: `+${fromNumber}` },
        { whatsappNumber: { $regex: escapedNumber, $options: 'i' } }
      ]
    }).populate('createdBy', 'name');

    if (!client) {
      twiml.message('You are not registered. Please contact your CA.');
      return res.type('text/xml').send(twiml.toString());
    }

    const lowerMessage = incomingMessage.toLowerCase();

    // Main Menu - When user sends "hi", "hello", "menu"
    if (lowerMessage === 'hi' || lowerMessage === 'hello' || lowerMessage === 'menu' || lowerMessage === 'help') {
      const responseText = `Hello ${client.name}! 👋

Welcome to ${client.createdBy?.name || 'CA'} Document Portal

Please choose an option:

1️⃣ Contact Consultant
2️⃣ Issued Documents
3️⃣ Pending Requests

Reply with the number (1, 2, or 3)`;

      twiml.message(responseText);
      return res.type('text/xml').send(twiml.toString());
    }

    // Option 1: Contact Consultant
    if (lowerMessage === '1' || lowerMessage.includes('contact')) {
      const consultantPhone = client.consultantPhone || 'Not available';
      const responseText = `📞 Contact Consultant

CA Name: ${client.createdBy?.name || 'N/A'}
Phone: ${consultantPhone}

You can call or WhatsApp on this number for any queries.

Reply 'menu' to go back to main menu.`;

      twiml.message(responseText);
      return res.type('text/xml').send(twiml.toString());
    }

    // Option 2: Issued Documents
    if (lowerMessage === '2' || lowerMessage.includes('issued') || lowerMessage.includes('documents')) {
      const allDocs = await Document.find({ clientId: client._id });
      
      if (allDocs.length === 0) {
        twiml.message(`📄 Issued Documents

You don't have any documents yet.

Reply 'menu' to go back.`);
        return res.type('text/xml').send(twiml.toString());
      }

      // Group documents by type
      const docsByType = {};
      allDocs.forEach(doc => {
        if (!docsByType[doc.documentType]) {
          docsByType[doc.documentType] = [];
        }
        docsByType[doc.documentType].push(doc);
      });

      let responseText = `📄 Issued Documents

Select document type:

`;
      let index = 1;
      Object.keys(docsByType).forEach(type => {
        responseText += `${index}️⃣ ${type} (${docsByType[type].length})\n`;
        index++;
      });

      responseText += `\nReply with document type name (e.g., ITR)\nReply 'menu' to go back`;

      twiml.message(responseText);
      return res.type('text/xml').send(twiml.toString());
    }

    // Option 3: Pending Requests
    if (lowerMessage === '3' || lowerMessage.includes('pending')) {
      const pendingRequests = await PendingRequest.find({ 
        clientId: client._id,
        status: { $in: ['PENDING', 'IN_PROGRESS'] }
      });

      if (pendingRequests.length === 0) {
        twiml.message(`⏳ Pending Requests

No pending requests at the moment.

Reply 'menu' to go back.`);
        return res.type('text/xml').send(twiml.toString());
      }

      let responseText = `⏳ Pending Requests\n\n`;
      pendingRequests.forEach((req, idx) => {
        const statusEmoji = req.status === 'IN_PROGRESS' ? '🔄' : '⏳';
        responseText += `${idx + 1}. ${statusEmoji} ${req.documentType} ${req.year}\n   Status: ${req.status}\n`;
        if (req.notes) {
          responseText += `   Note: ${req.notes}\n`;
        }
        responseText += `\n`;
      });

      responseText += `Reply 'menu' to go back.`;

      twiml.message(responseText);
      return res.type('text/xml').send(twiml.toString());
    }

    // Handle document type selection (ITR, GST, TDS, etc.)
    const documentTypes = ['ITR', 'GST', 'TDS', 'AUDIT', 'BALANCE SHEET', 'AUDIT REPORT'];
    const matchedType = documentTypes.find(type => lowerMessage.includes(type.toLowerCase()));

    if (matchedType) {
      const docs = await Document.find({ 
        clientId: client._id,
        documentType: matchedType
      }).sort({ year: -1 });

      if (docs.length === 0) {
        twiml.message(`No ${matchedType} documents found.\n\nReply 'menu' to go back.`);
        return res.type('text/xml').send(twiml.toString());
      }

      let responseText = `📄 ${matchedType} Documents\n\n`;
      docs.forEach((doc, idx) => {
        responseText += `${idx + 1}️⃣ ${doc.year}\n   ${doc.fileUrl}\n\n`;
      });
      responseText += `Click on link to download\nReply 'menu' to go back`;

      twiml.message(responseText);
      return res.type('text/xml').send(twiml.toString());
    }

    // Handle direct document request: "ITR 2025-26"
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
          let responseText = `${documentType} for ${year} not found.\n\nAvailable ${documentType} documents:\n\n`;
          availableDocs.forEach(doc => {
            responseText += `📄 ${doc.year}\n`;
          });
          responseText += `\nReply 'menu' to go back`;
          twiml.message(responseText);
        } else {
          twiml.message(`${documentType} for ${year} not filed yet.\n\nReply 'menu' to go back.`);
        }
        return res.type('text/xml').send(twiml.toString());
      }

      // Send document link
      const responseText = `📄 ${documentType} ${year}\n\n${document.fileUrl}\n\nReply 'menu' for main menu`;
      twiml.message(responseText);
      console.log('Sending document:', document.fileUrl);
      return res.type('text/xml').send(twiml.toString());
    }

    // Default response
    twiml.message(`I didn't understand that.\n\nReply 'menu' to see options.`);
    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    console.error('Webhook error:', error);
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('An error occurred. Please try again later or reply "menu".');
    res.type('text/xml').send(twiml.toString());
  }
};

// Test endpoint to verify webhook is working
exports.testWebhook = (req, res) => {
  res.json({ 
    message: 'Webhook is working',
    timestamp: new Date().toISOString()
  });
};

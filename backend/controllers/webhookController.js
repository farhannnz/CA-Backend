const twilio = require('twilio');
const Client = require('../models/Client');
const Document = require('../models/Document');

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
    // Escape special regex characters in phone number
    const escapedNumber = fromNumber.replace(/[+\-()]/g, '\\$&');
    const client = await Client.findOne({
      $or: [
        { whatsappNumber: fromNumber },
        { whatsappNumber: `+${fromNumber}` },
        { whatsappNumber: { $regex: escapedNumber, $options: 'i' } }
      ]
    });

    if (!client) {
      twiml.message('You are not registered. Please contact your CA.');
      return res.type('text/xml').send(twiml.toString());
    }

    // Parse message format: "ITR 2025-26" or "GST 2024-25"
    const messageParts = incomingMessage.split(/\s+/);

    if (messageParts.length < 2) {
      twiml.message('Invalid format. Please send: DOCUMENT_TYPE YEAR\nExample: ITR 2025-26');
      return res.type('text/xml').send(twiml.toString());
    }

    const documentType = messageParts[0].toUpperCase();
    const year = messageParts[1];

    // Search for document
    const document = await Document.findOne({
      clientId: client._id,
      documentType: documentType,
      year: year
    });

    if (!document) {
      twiml.message(`${documentType} for ${year} not filed yet. Please contact your CA.`);
      return res.type('text/xml').send(twiml.toString());
    }

    // Send document
    const message = twiml.message();
    message.body(`Here is your ${documentType} for ${year}:`);
    message.media(document.fileUrl);

    console.log('Sending document:', document.fileUrl);

    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    console.error('Webhook error:', error);
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('An error occurred. Please try again later.');
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

const twilio = require('twilio');
const Client = require('../models/Client');
const Document = require('../models/Document');
const PendingRequest = require('../models/PendingRequest');

class SmartWebhookController {
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
            const client = await this.findClientByNumber(fromNumber);

            if (!client) {
                twiml.message('You are not registered. Please contact your CA.');
                return res.type('text/xml').send(twiml.toString());
            }

            // Process message with smart keyword detection
            const response = await this.processSmartMessage(incomingMessage, client);
            twiml.message(response);

            return res.type('text/xml').send(twiml.toString());

        } catch (error) {
            console.error('❌ Webhook error:', error);
            const twiml = new twilio.twiml.MessagingResponse();
            twiml.message('An error occurred. Please try again later or reply "menu".');
            res.type('text/xml').send(twiml.toString());
        }
    }

    async processSmartMessage(incomingMessage, client) {
        const lowerMessage = incomingMessage.toLowerCase();

        // Main Menu - When user sends "hi", "hello", "menu"
        if (this.isGreeting(lowerMessage)) {
            return this.getMainMenu(client);
        }

        // Menu options (1, 2, 3)
        if (lowerMessage === '1' || this.isContactRequest(lowerMessage)) {
            return this.getConsultantInfo(client);
        }

        if (lowerMessage === '2' || this.isDocumentListRequest(lowerMessage)) {
            return await this.getAllDocuments(client);
        }

        if (lowerMessage === '3' || this.isPendingRequest(lowerMessage)) {
            return await this.getPendingRequests(client);
        }

        // Smart keyword-based document search
        const documentResponse = await this.searchDocumentsByKeywords(lowerMessage, client);
        if (documentResponse) {
            return documentResponse;
        }

        // Fallback to original system - exact document type matching
        const originalResponse = await this.processOriginalLogic(incomingMessage, client);
        if (originalResponse) {
            return originalResponse;
        }

        // Final fallback - show menu
        return this.getMainMenu(client);
    }

    // Greeting detection
    isGreeting(message) {
        const greetings = ['hi', 'hello', 'hey', 'namaste', 'good morning', 'good afternoon', 'start', 'begin', 'menu', 'help'];
        return greetings.some(greeting => message.includes(greeting));
    }

    // Contact request detection
    isContactRequest(message) {
        const contactKeywords = ['contact', 'call', 'phone', 'number', 'consultant', 'ca contact', 'reach'];
        return contactKeywords.some(keyword => message.includes(keyword));
    }

    // Document list request detection
    isDocumentListRequest(message) {
        const listKeywords = ['documents', 'list', 'show all', 'all documents', 'my documents', 'issued'];
        return listKeywords.some(keyword => message.includes(keyword));
    }

    // Pending request detection
    isPendingRequest(message) {
        const pendingKeywords = ['pending', 'status', 'progress', 'waiting', 'when', 'ready'];
        return pendingKeywords.some(keyword => message.includes(keyword));
    }

    // Smart document search by keywords
    async searchDocumentsByKeywords(message, client) {
        // Define document keywords (case insensitive)
        const documentKeywords = {
            'ITR': ['itr', 'income tax', 'tax return', 'income tax return', 'return'],
            'GST': ['gst', 'gst return', 'gstr', 'goods and services tax', 'sales tax'],
            'TDS': ['tds', 'tds certificate', 'tax deduction', 'tax deducted', 'deduction'],
            'AUDIT': ['audit', 'audit report', 'auditing', 'audited'],
            'BALANCE SHEET': ['balance sheet', 'balance', 'financial statement', 'statement'],
            'AUDIT REPORT': ['audit report', 'auditor report', 'audit certificate']
        };

        // Find matching document types
        const matchedTypes = [];
        for (const [docType, keywords] of Object.entries(documentKeywords)) {
            if (keywords.some(keyword => message.includes(keyword))) {
                matchedTypes.push(docType);
            }
        }

        if (matchedTypes.length === 0) {
            return null; // No document keywords found
        }

        // Extract year if present
        const yearMatch = message.match(/\b(20\d{2}[-\/]?\d{0,2}|\d{4}[-\/]\d{2})\b/);
        const year = yearMatch ? yearMatch[0] : null;

        console.log('🔍 Matched types:', matchedTypes, 'Year:', year);

        // Search for documents
        let allMatchedDocs = [];

        for (const docType of matchedTypes) {
            const query = {
                clientId: client._id,
                documentType: docType
            };

            if (year) {
                query.year = year;
            }

            const docs = await Document.find(query).sort({ year: -1 });
            allMatchedDocs = allMatchedDocs.concat(docs.map(doc => ({ ...doc.toObject(), matchedType: docType })));
        }

        if (allMatchedDocs.length === 0) {
            if (year) {
                return `No ${matchedTypes.join(' or ')} documents found for ${year}.\n\nReply 'menu' to see other options.`;
            } else {
                return `No ${matchedTypes.join(' or ')} documents found.\n\nReply 'menu' to see other options.`;
            }
        }

        // Format response
        if (allMatchedDocs.length === 1) {
            const doc = allMatchedDocs[0];
            return `📄 ${doc.documentType} ${doc.year}\n\n${doc.fileUrl}\n\nReply 'menu' for main menu`;
        } else {
            // Multiple documents found
            let response = `📄 Found ${allMatchedDocs.length} documents:\n\n`;

            // Group by type
            const groupedDocs = {};
            allMatchedDocs.forEach(doc => {
                if (!groupedDocs[doc.documentType]) {
                    groupedDocs[doc.documentType] = [];
                }
                groupedDocs[doc.documentType].push(doc);
            });

            Object.keys(groupedDocs).forEach(docType => {
                response += `📋 ${docType}:\n`;
                groupedDocs[docType].forEach(doc => {
                    response += `• ${doc.year} - ${doc.fileUrl}\n`;
                });
                response += '\n';
            });

            response += 'Click on links to download\nReply \'menu\' for main menu';
            return response;
        }
    }

    getMainMenu(client) {
        return `Hello ${client.name}! 👋

Welcome to ${client.createdBy?.name || 'CA'} Document Portal

🤖 You can ask me naturally:
• "Show my ITR for 2025-26"
• "GST documents"
• "What's pending?"
• "Contact consultant"

📋 Or choose an option:
1️⃣ Contact Consultant
2️⃣ All Documents  
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

    async getAllDocuments(client) {
        const allDocs = await Document.find({ clientId: client._id }).sort({ documentType: 1, year: -1 });

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

        let response = `📄 Your Documents (${allDocs.length} total):\n\n`;

        Object.keys(docsByType).forEach(type => {
            response += `📋 ${type} (${docsByType[type].length}):\n`;
            docsByType[type].forEach(doc => {
                response += `• ${doc.year} - ${doc.fileUrl}\n`;
            });
            response += '\n';
        });

        response += 'Click on links to download\nReply \'menu\' to go back';
        return response;
    }

    async getPendingRequests(client) {
        const pendingRequests = await PendingRequest.find({
            clientId: client._id,
            status: { $in: ['PENDING', 'IN_PROGRESS'] }
        });

        if (pendingRequests.length === 0) {
            return `⏳ Pending Requests\n\nNo pending requests at the moment.\n\nReply 'menu' to go back.`;
        }

        let response = `⏳ Pending Requests (${pendingRequests.length}):\n\n`;
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

    // Original system fallback - exact matching like before
    async processOriginalLogic(incomingMessage, client) {
        const lowerMessage = incomingMessage.toLowerCase();

        // Document type selection (exact matching like before)
        const documentTypes = ['ITR', 'GST', 'TDS', 'AUDIT', 'BALANCE SHEET', 'AUDIT REPORT'];
        const matchedType = documentTypes.find(type => lowerMessage.includes(type.toLowerCase()));

        if (matchedType) {
            const docs = await Document.find({
                clientId: client._id,
                documentType: matchedType.toUpperCase()
            }).sort({ year: -1 });

            if (docs.length === 0) {
                return `No ${matchedType} documents found.\n\nReply 'menu' to go back.`;
            }

            let response = `📄 ${matchedType} Documents\n\n`;
            docs.forEach((doc, idx) => {
                response += `${idx + 1}️⃣ ${doc.year}\n   ${doc.fileUrl}\n\n`;
            });
            response += `Click on link to download\nReply 'menu' to go back`;
            return response;
        }

        // Direct document request: "ITR 2025-26" (exact format like before)
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

            // Send document link
            return `📄 ${documentType} ${year}\n\n${document.fileUrl}\n\nReply 'menu' for main menu`;
        }

        return null; // No match found, will show main menu
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
            message: 'Smart keyword-based webhook is working',
            timestamp: new Date().toISOString(),
            features: [
                'Case-insensitive keyword matching',
                'Multiple document search',
                'Year extraction',
                'Natural language support',
                'Fallback to menu system'
            ]
        });
    }
}

module.exports = new SmartWebhookController();
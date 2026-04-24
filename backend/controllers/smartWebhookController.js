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

        // Extract year with smart mapping
        const yearMatch = message.match(/\b(20\d{2}[-\/]?\d{0,2}|\d{4}[-\/]\d{2})\b/);
        let year = null;

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
            }
        }

        console.log('🔍 Matched types:', matchedTypes, 'Year:', year);

        // Search for documents
        let allMatchedDocs = [];

        for (const docType of matchedTypes) {
            // Check for month keywords for GST/TDS
            let month = null;
            let quarter = null;

            if (docType === 'GST' || docType === 'TDS') {
                // Month mapping
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

                // Check for month
                for (const [monthCode, keywords] of Object.entries(monthKeywords)) {
                    if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
                        month = monthCode;
                        console.log('✅ Found month:', monthCode);
                        break;
                    }
                }

                // Check for quarter if no month found
                if (!month) {
                    for (const [quarterCode, keywords] of Object.entries(quarterKeywords)) {
                        if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
                            quarter = quarterCode;
                            console.log('✅ Found quarter:', quarterCode);
                            break;
                        }
                    }
                }
            }

            const query = {
                clientId: client._id
            };

            // Build document type query
            if ((docType === 'GST' || docType === 'TDS')) {
                if (month) {
                    query.documentType = `${docType}-${month}`;
                } else if (quarter) {
                    query.documentType = `${docType}-${quarter}`;
                } else {
                    // If no specific month/quarter, search for all variants
                    query.documentType = { $regex: `^${docType}`, $options: 'i' };
                }
            } else {
                query.documentType = docType;
            }

            if (year) {
                query.year = year;
            }

            const docs = await Document.find(query).sort({ year: -1 });
            allMatchedDocs = allMatchedDocs.concat(docs.map(doc => ({ ...doc.toObject(), matchedType: docType })));
        }

        if (allMatchedDocs.length === 0) {
            // Show apology with consultant contact info
            const consultantPhone = client.consultantPhone || 'Not available';
            const consultantInfo = consultantPhone !== 'Not available' 
                ? `\n📞 Contact your CA: ${consultantPhone}\nCA: ${client.createdBy?.name || 'N/A'}`
                : `\n📞 Contact your CA: ${client.createdBy?.name || 'N/A'}`;

            if (year) {
                return `❌ Sorry, no ${matchedTypes.join(' or ')} documents are available for ${year} yet.

This document may not be filed or uploaded yet.${consultantInfo}

You can contact your CA for more information.

Reply 'menu' to see other options.`;
            } else {
                return `❌ Sorry, no ${matchedTypes.join(' or ')} documents are available yet.

These documents may not be filed or uploaded yet.${consultantInfo}

You can contact your CA for more information.

Reply 'menu' to see other options.`;
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
            // Show apology with consultant contact info
            const consultantPhone = client.consultantPhone || 'Not available';
            const consultantInfo = consultantPhone !== 'Not available' 
                ? `\n📞 Contact your CA: ${consultantPhone}\nCA: ${client.createdBy?.name || 'N/A'}`
                : `\n📞 Contact your CA: ${client.createdBy?.name || 'N/A'}`;

            return `📄 Your Documents

❌ Sorry, no documents are available yet.

Your documents may not be uploaded yet.${consultantInfo}

You can contact your CA to check on your document status.

Reply 'menu' to go back.`;
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
                // Show apology with consultant contact info
                const consultantPhone = client.consultantPhone || 'Not available';
                const consultantInfo = consultantPhone !== 'Not available' 
                    ? `\n📞 Contact your CA: ${consultantPhone}\nCA: ${client.createdBy?.name || 'N/A'}`
                    : `\n📞 Contact your CA: ${client.createdBy?.name || 'N/A'}`;

                return `❌ Sorry, no ${matchedType} documents are available yet.

These documents may not be filed or uploaded yet.${consultantInfo}

You can contact your CA for more information.

Reply 'menu' to go back.`;
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
                    let response = `❌ Sorry, ${documentType} for ${year} is not available yet.\n\nAvailable ${documentType} documents:\n\n`;
                    availableDocs.forEach(doc => {
                        response += `📄 ${doc.year}\n`;
                    });
                    response += `\nReply 'menu' to go back`;
                    return response;
                } else {
                    // Show apology with consultant contact info
                    const consultantPhone = client.consultantPhone || 'Not available';
                    const consultantInfo = consultantPhone !== 'Not available' 
                        ? `\n📞 Contact your CA: ${consultantPhone}\nCA: ${client.createdBy?.name || 'N/A'}`
                        : `\n📞 Contact your CA: ${client.createdBy?.name || 'N/A'}`;

                    return `❌ Sorry, ${documentType} for ${year} is not available yet.

This document may not be filed or uploaded yet.${consultantInfo}

You can contact your CA for more information.

Reply 'menu' to go back.`;
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
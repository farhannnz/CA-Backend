require('dotenv').config();
const mongoose = require('mongoose');
const Document = require('../models/Document');
const Client = require('../models/Client');

async function testDocumentSearch() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Test the exact search that's failing
    const testNumber = '+918668846240';
    const testMessage = 'i want itr 2025-26';
    
    console.log(`\n🧪 Testing search for: "${testMessage}"`);
    console.log(`📱 WhatsApp number: ${testNumber}\n`);
    
    // Find client
    const client = await Client.findOne({
      whatsappNumber: { $regex: testNumber.replace(/[+\-()]/g, '\\$&'), $options: 'i' }
    });
    
    if (!client) {
      console.log('❌ Client not found for number:', testNumber);
      
      // Show all clients
      const allClients = await Client.find();
      console.log('\n📋 Available clients:');
      allClients.forEach(c => {
        console.log(`   • ${c.name} - ${c.whatsappNumber}`);
      });
      
      mongoose.disconnect();
      return;
    }
    
    console.log('✅ Client found:', client.name);
    
    // Extract keywords
    const documentType = 'ITR'; // from "itr"
    const year = '2025-26'; // from "2025-26"
    
    console.log(`🔍 Searching for: ${documentType} ${year}`);
    
    // Try exact search
    let document = await Document.findOne({
      clientId: client._id,
      documentType: documentType,
      year: year
    });
    
    console.log('📄 Exact match result:', document ? 'Found' : 'Not found');
    
    if (!document) {
      // Try regex search
      document = await Document.findOne({
        clientId: client._id,
        documentType: { $regex: `^${documentType}`, $options: 'i' },
        year: year
      });
      
      console.log('📄 Regex match result:', document ? 'Found' : 'Not found');
    }
    
    if (document) {
      console.log('✅ Document details:');
      console.log(`   Type: ${document.documentType}`);
      console.log(`   Year: ${document.year}`);
      console.log(`   File: ${document.fileName}`);
      console.log(`   URL: ${document.fileUrl}`);
    } else {
      // Show all documents for this client
      const allDocs = await Document.find({ clientId: client._id });
      console.log(`\n📋 All documents for ${client.name}:`);
      if (allDocs.length === 0) {
        console.log('   ❌ No documents found');
      } else {
        allDocs.forEach(doc => {
          console.log(`   • ${doc.documentType} ${doc.year} (${doc.fileName})`);
        });
      }
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDocumentSearch();
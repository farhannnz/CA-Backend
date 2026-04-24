require('dotenv').config();
const mongoose = require('mongoose');
const Client = require('../models/Client');
const Document = require('../models/Document');
const PendingRequest = require('../models/PendingRequest');

async function clearAllData() {
  try {
    console.log('🚀 Starting data cleanup...\n');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Count existing data
    const clientCount = await Client.countDocuments();
    const documentCount = await Document.countDocuments();
    const pendingCount = await PendingRequest.countDocuments();
    
    console.log('📊 Current data:');
    console.log(`   Clients: ${clientCount}`);
    console.log(`   Documents: ${documentCount}`);
    console.log(`   Pending Requests: ${pendingCount}\n`);
    
    if (clientCount === 0 && documentCount === 0 && pendingCount === 0) {
      console.log('✅ Database is already clean!\n');
      mongoose.disconnect();
      return;
    }
    
    // Clear all data
    console.log('🗑️  Clearing all data...\n');
    
    // Delete all clients
    const clientResult = await Client.deleteMany({});
    console.log(`✅ Deleted ${clientResult.deletedCount} clients`);
    
    // Delete all documents
    const documentResult = await Document.deleteMany({});
    console.log(`✅ Deleted ${documentResult.deletedCount} documents`);
    
    // Delete all pending requests
    const pendingResult = await PendingRequest.deleteMany({});
    console.log(`✅ Deleted ${pendingResult.deletedCount} pending requests`);
    
    console.log('\n🎉 All data cleared successfully!');
    console.log('\n📋 What to do next:');
    console.log('1. Login to your CA dashboard');
    console.log('2. Add new clients with WhatsApp numbers');
    console.log('3. Upload documents for those clients');
    console.log('4. Test WhatsApp bot with registered numbers\n');
    
    mongoose.disconnect();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error clearing data:', error.message);
    mongoose.disconnect();
  }
}

clearAllData();
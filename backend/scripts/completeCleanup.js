require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');

async function completeCleanup() {
    console.log('🧹 COMPLETE DATA CLEANUP STARTING...\n');
    console.log('⚠️  This will delete ALL clients, documents, and files!\n');

    try {
        // Step 1: Clear MongoDB data
        console.log('📊 Step 1: Clearing MongoDB data...');
        execSync('node clearAllData.js', { stdio: 'inherit', cwd: __dirname });

        console.log('\n📁 Step 2: Clearing Supabase files...');
        execSync('node clearSupabaseFiles.js', { stdio: 'inherit', cwd: __dirname });

        console.log('\n🎉 COMPLETE CLEANUP FINISHED!\n');
        console.log('✅ MongoDB: All clients, documents, and pending requests deleted');
        console.log('✅ Supabase: All uploaded files deleted');
        console.log('✅ Database structure: Preserved (tables/collections remain)');

        console.log('\n📋 FRESH START READY!');
        console.log('1. 🔐 Login to CA dashboard');
        console.log('2. 👥 Add new clients with WhatsApp numbers');
        console.log('3. 📄 Upload documents for clients');
        console.log('4. 📱 Test WhatsApp bot');
        console.log('\n🚀 Your system is now clean and ready for fresh data!');

    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
    }
}

completeCleanup();
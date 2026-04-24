require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function clearSupabaseFiles() {
  try {
    console.log('🚀 Starting Supabase cleanup...\n');
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );
    
    console.log('✅ Connected to Supabase\n');
    
    // List all files in the documents bucket
    const { data: files, error: listError } = await supabase.storage
      .from('documents')
      .list('', {
        limit: 1000,
        offset: 0
      });
    
    if (listError) {
      console.error('❌ Error listing files:', listError.message);
      return;
    }
    
    if (!files || files.length === 0) {
      console.log('✅ No files found in Supabase storage\n');
      return;
    }
    
    console.log(`📊 Found ${files.length} files in Supabase storage\n`);
    
    // Delete all files
    const filePaths = files.map(file => file.name);
    
    console.log('🗑️  Deleting files...');
    files.forEach(file => {
      console.log(`   • ${file.name} (${(file.metadata?.size / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    const { data: deleteData, error: deleteError } = await supabase.storage
      .from('documents')
      .remove(filePaths);
    
    if (deleteError) {
      console.error('❌ Error deleting files:', deleteError.message);
      return;
    }
    
    console.log(`\n✅ Successfully deleted ${filePaths.length} files from Supabase`);
    console.log('\n🎉 Supabase storage cleared successfully!\n');
    
  } catch (error) {
    console.error('❌ Error clearing Supabase:', error.message);
  }
}

clearSupabaseFiles();
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Use memory storage for multer
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Helper function to upload to Supabase
const uploadToSupabase = async (file, userId, clientId, year, documentType) => {
  try {
    const fileName = `${documentType}_${Date.now()}.pdf`;
    const filePath = `${userId}/${clientId}/${year}/${fileName}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('ca-documents')
      .upload(filePath, file.buffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('ca-documents')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Supabase upload error:', error);
    throw error;
  }
};

module.exports = { upload, uploadToSupabase, supabase };

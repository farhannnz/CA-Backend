const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const { clientId, year, documentType } = req.body;
    return {
      folder: `ca-documents/${req.userId}/${clientId}/${year}`,
      resource_type: 'raw',
      public_id: `${documentType}_${Date.now()}`,
      format: 'pdf', // This ensures .pdf extension
      use_filename: true,
      unique_filename: false
    };
  }
});

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

module.exports = upload;

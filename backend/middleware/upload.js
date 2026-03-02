const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const { clientId, year } = req.body;
    const caId = req.userId;
    
    // Create directory structure: uploads/caId/clientId/year/
    const uploadPath = path.join('uploads', caId.toString(), clientId, year);
    
    // Create directories if they don't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    
    cb(null, uploadPath);
  },
  filename: function(req, file, cb) {
    const { documentType } = req.body;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${documentType}_${timestamp}${ext}`;
    cb(null, filename);
  }
});

// File filter - only PDF
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

module.exports = upload;

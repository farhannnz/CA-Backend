const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/', auth, upload.single('document'), documentController.uploadDocument);
router.get('/', auth, documentController.getAllDocuments);
router.get('/client/:clientId', auth, documentController.getClientDocuments);
router.delete('/:id', auth, documentController.deleteDocument);

module.exports = router;

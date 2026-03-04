const Document = require('../models/Document');
const Client = require('../models/Client');
const path = require('path');

// Upload document
exports.uploadDocument = async (req, res) => {
  try {
    const { clientId, year, documentType } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verify client belongs to this CA
    const client = await Client.findOne({
      _id: clientId,
      createdBy: req.userId
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Generate public URL from Cloudinary
    // Cloudinary raw files need .pdf extension in URL
    let fileUrl = req.file.path;
    
    // If URL doesn't have extension, construct proper URL
    if (!fileUrl.includes('.pdf')) {
      // Extract parts from Cloudinary URL
      const urlParts = fileUrl.split('/upload/');
      if (urlParts.length === 2) {
        fileUrl = `${urlParts[0]}/upload/${urlParts[1]}.pdf`;
      }
    }

    const document = new Document({
      clientId,
      year,
      documentType: documentType.toUpperCase(),
      fileUrl,
      fileName: req.file.originalname,
      uploadedBy: req.userId
    });

    await document.save();

    res.status(201).json({
      message: 'Document uploaded successfully',
      document
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all documents for a client
exports.getClientDocuments = async (req, res) => {
  try {
    const { clientId } = req.params;

    // Verify client belongs to this CA
    const client = await Client.findOne({
      _id: clientId,
      createdBy: req.userId
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const documents = await Document.find({ clientId })
      .sort({ uploadDate: -1 });

    res.json({ documents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all documents for logged-in CA
exports.getAllDocuments = async (req, res) => {
  try {
    // Get all clients of this CA
    const clients = await Client.find({ createdBy: req.userId });
    const clientIds = clients.map(c => c._id);

    const documents = await Document.find({ clientId: { $in: clientIds } })
      .populate('clientId', 'name whatsappNumber')
      .sort({ uploadDate: -1 });

    res.json({ documents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete document
exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Verify document belongs to this CA's client
    const client = await Client.findOne({
      _id: document.clientId,
      createdBy: req.userId
    });

    if (!client) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await document.deleteOne();

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

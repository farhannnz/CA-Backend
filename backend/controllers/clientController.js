const Client = require('../models/Client');

// Add new client
exports.addClient = async (req, res) => {
  try {
    const { name, whatsappNumber, consultantPhone } = req.body;

    // Normalize WhatsApp number
    let normalizedNumber = whatsappNumber.trim();
    if (!normalizedNumber.startsWith('+')) {
      normalizedNumber = '+' + normalizedNumber;
    }

    // Normalize consultant phone if provided
    let normalizedConsultantPhone = '';
    if (consultantPhone && consultantPhone.trim()) {
      normalizedConsultantPhone = consultantPhone.trim();
      if (!normalizedConsultantPhone.startsWith('+')) {
        normalizedConsultantPhone = '+' + normalizedConsultantPhone;
      }
    }

    const client = new Client({
      name,
      whatsappNumber: normalizedNumber,
      consultantPhone: normalizedConsultantPhone,
      createdBy: req.userId
    });

    await client.save();

    res.status(201).json({
      message: 'Client added successfully',
      client
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all clients for logged-in CA
exports.getClients = async (req, res) => {
  try {
    const clients = await Client.find({ createdBy: req.userId })
      .sort({ createdAt: -1 });

    res.json({ clients });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single client
exports.getClient = async (req, res) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      createdBy: req.userId
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({ client });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete client
exports.deleteClient = async (req, res) => {
  try {
    const client = await Client.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.userId
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update client
exports.updateClient = async (req, res) => {
  try {
    const { name, whatsappNumber, consultantPhone } = req.body;

    const updateData = {};

    if (name) updateData.name = name.trim();

    if (whatsappNumber) {
      let normalizedNumber = whatsappNumber.trim();
      if (!normalizedNumber.startsWith('+')) {
        normalizedNumber = '+' + normalizedNumber;
      }
      updateData.whatsappNumber = normalizedNumber;
    }

    if (consultantPhone !== undefined) {
      if (consultantPhone && consultantPhone.trim()) {
        let normalizedConsultantPhone = consultantPhone.trim();
        if (!normalizedConsultantPhone.startsWith('+')) {
          normalizedConsultantPhone = '+' + normalizedConsultantPhone;
        }
        updateData.consultantPhone = normalizedConsultantPhone;
      } else {
        updateData.consultantPhone = '';
      }
    }

    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.userId },
      updateData,
      { new: true }
    );

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({
      message: 'Client updated successfully',
      client
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

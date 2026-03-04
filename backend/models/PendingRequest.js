const mongoose = require('mongoose');

const pendingRequestSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  documentType: {
    type: String,
    required: true,
    uppercase: true
  },
  year: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
    default: 'PENDING'
  },
  notes: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

pendingRequestSchema.index({ clientId: 1 });
pendingRequestSchema.index({ status: 1 });

module.exports = mongoose.model('PendingRequest', pendingRequestSchema);

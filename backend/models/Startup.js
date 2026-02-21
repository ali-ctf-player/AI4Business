const mongoose = require('mongoose');

const startupSchema = new mongoose.Schema({
  founderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  companyName: { type: String, required: true },
  industry: { type: String, required: true, index: true },
  stage: { type: String, enum: ['Idea', 'Seed', 'Series A'], required: true, index: true },
  pitchDeckUrl: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Startup', startupSchema);

// ~/Downloads/AI4Business/backend/models/ItHub.js
const mongoose = require('mongoose');

const itHubSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  location: String,
  website: String,
  logo_url: String,
}, { timestamps: true });

module.exports = mongoose.model('ItHub', itHubSchema);

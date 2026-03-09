const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String },
  myGovId: { type: String, unique: true, sparse: true },
  role: {
    type: String,
    enum: ['startup', 'investor', 'organizer', 'mentor', 'judge', 'incubator', 'admin', 'superadmin'],
    required: true
  },
  fullName: { type: String, required: true },
  authProvider: { type: String, enum: ['local', 'github', 'google', 'mygov', 'asanimza'], default: 'local' },
  isVerified: { type: Boolean, default: false },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String },
  isDeleted: { type: Boolean, default: false },
  lastLogin: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

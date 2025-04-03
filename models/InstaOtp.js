const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  profileName: {
    type: String,
    required: true
  },
  profileUrl: {
    type: String
  },
  otp: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'send', 'verified', 'expired'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: { expires: '15d' } // More readable format (15 days)
  }
});

// Explicitly create the index if needed
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 1296000 });

module.exports = mongoose.model('InstaOtp', otpSchema);
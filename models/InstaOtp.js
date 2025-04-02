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
  otp: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending','send', 'verified', 'expired'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 // Auto-delete after 5 minutes (300 seconds)
  }
});

module.exports = mongoose.model('InstaOtp', otpSchema);
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  chat: [
    {
      content: { type: String, required: true },
      status: {
        type: String,
        enum: ['sent', 'received'],
        default: 'sent',
      },
      messageStatus: {
        type: String,
        enum: ['unread', 'read'],  // New field
        default: 'unread',
      },
      timestamp: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);

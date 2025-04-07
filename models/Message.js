const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'PageOwner', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'PageOwner', required: true },
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
      Notification:{
        type: Number,
        default:0
      },
      timestamp: { type: Date, default: Date.now,expires: 1296000 }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);

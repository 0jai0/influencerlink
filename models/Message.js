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
        enum: ['unread', 'read'],
        default: 'unread',
      },
      Notification: {
        type: Number,
        default: 0
      },
      timestamp: { 
        type: Date, 
        default: Date.now
      }
    }
  ],
  expireAt: {
    type: Date,
    default: () => new Date(Date.now() + 50 * 60 * 60 * 1000), // 50 hours
    index: { expires: 0 } // TTL index
  }
}, { timestamps: true });

// Middleware to trim chat array to last 60 messages before save
messageSchema.pre('save', function(next) {
  if (this.chat.length > 60) {
    this.chat = this.chat.slice(-60); // keep only last 60 messages
  }
  if (this.chat.length === 0) {
    this.expireAt = new Date(); // expire immediately if empty
  }
  next();
});

// Optional: clean up empty chats older than 50 hours
messageSchema.statics.cleanupEmptyChats = async function() {
  const fiftyHoursAgo = new Date(Date.now() - 50 * 60 * 60 * 1000);
  const docsToExpire = await this.find({
    chat: { $size: 0 },
    createdAt: { $lte: fiftyHoursAgo }
  });
  await Promise.all(docsToExpire.map(doc => {
    doc.expireAt = new Date();
    return doc.save();
  }));
};

module.exports = mongoose.model('Message', messageSchema);

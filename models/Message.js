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
        default: Date.now,
        expires: 1296000 // 15 days in seconds for individual messages
      }
    }
  ],
  // Add a field to track when the document should expire
  expireAt: {
    type: Date,
    default: () => new Date(Date.now() + 60 * 60 * 60 * 1000), // 50 hours from now
    index: { expires: 0 } // TTL index
  }
}, { timestamps: true });

// Middleware to update expireAt when chat array changes
messageSchema.pre('save', function(next) {
  // If chat array is empty, set immediate expiration
  if (this.chat.length === 0) {
    this.expireAt = new Date();
  }
  next();
});

// Static method to clean up empty chat documents
messageSchema.statics.cleanupEmptyChats = async function() {
  const fiftyHoursAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  // Find documents with empty chat array and older than 50 hours
  const docsToExpire = await this.find({
    $and: [
      { chat: { $size: 0 } },
      { createdAt: { $lte: fiftyHoursAgo } }
    ]
  });
  
  // Set immediate expiration for these documents
  await Promise.all(docsToExpire.map(doc => {
    doc.expireAt = new Date();
    return doc.save();
  }));
};

module.exports = mongoose.model('Message', messageSchema);
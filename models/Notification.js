const mongoose = require("mongoose");

const singleNotificationSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  time: { type: Date, default: Date.now },
  mediaLink: { type: String },
});

// Main schema: one per user
const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  notifications: [singleNotificationSchema],
});

// Middleware: Clean up before saving
notificationSchema.pre("save", function (next) {
  try {
    // 1. Remove all read notifications
    this.notifications = this.notifications.filter(n => !n.isRead);

    // 2. Keep max 60 (newest 60 only)
    if (this.notifications.length > 60) {
      this.notifications = this.notifications
        .sort((a, b) => b.time - a.time) // sort by time desc
        .slice(0, 60);
    }

    next();
  } catch (err) {
    next(err);
  }
});

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;

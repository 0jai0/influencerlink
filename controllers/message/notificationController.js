const messaging = require("./firebaseAdmin"); // firebase-admin messaging instance
const Token = require("../../models/Token"); // user token model
const Notification = require("../../models/Notification"); // updated embedded schema

// ✅ Store FCM token
exports.storeUserFCMToken = async (req, res) => {
  try {
    const { userId, token } = req.body;
    if (!userId || !token) {
      return res.status(400).json({ success: false, message: "User ID and token are required" });
    }

    const user = await Token.findOneAndUpdate(
      { userId },
      { fcmToken: token },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: "Token stored successfully", user });
  } catch (error) {
    console.error("Error storing token:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Get user FCM token
exports.getUserToken = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await Token.findOne({ userId });
    if (!user) return res.status(404).json({ success: false, message: "Token not found" });
    res.json({ success: true, token: user.fcmToken });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


// ✅ Send notification (push + DB save)
exports.sendNotification = async (req, res) => {
  try {
    const { userId, subject, message, mediaLink } = req.body;
    if (!userId || !subject || !message) {
      return res.status(400).json({ success: false, message: "userId, subject, and message are required" });
    }

    // Get user token
    const user = await Token.findOne({ userId });
    if (!user) return res.status(404).json({ success: false, message: "User token not found" });

    // Expo Push API
    const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: user.fcmToken, // actually Expo token
        sound: "default",
        title: subject,
        body: message,
        data: { userId, subject, message, mediaLink: mediaLink || "" },
      }),
    });

    const result = await expoRes.json();

    // Store in DB
    let userNotifications = await Notification.findOne({ userId });
    const newNotification = { subject, message, mediaLink };

    if (!userNotifications) {
      userNotifications = new Notification({ userId, notifications: [newNotification] });
    } else {
      userNotifications.notifications.push(newNotification);
    }

    await userNotifications.save();

    res.json({ success: true, message: "Notification sent and stored", notification: newNotification, expoResult: result });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};


// ✅ Get all notifications for a user
exports.getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const doc = await Notification.findOne({ userId });
    if (!doc) return res.json({ success: true, notifications: [] });
    res.json({ success: true, notifications: doc.notifications.sort((a, b) => b.time - a.time) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Mark notification as read (auto removed by pre-save hook)
exports.markNotificationAsRead = async (req, res) => {
  try {
    const { userId, notificationId } = req.body;
    const doc = await Notification.findOne({ userId });
    if (!doc) return res.status(404).json({ success: false, message: "User notifications not found" });

    const notif = doc.notifications.id(notificationId);
    if (!notif) return res.status(404).json({ success: false, message: "Notification not found" });

    notif.isRead = true;
    await doc.save(); // pre-save hook deletes read ones

    res.json({ success: true, message: "Notification marked as read & deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

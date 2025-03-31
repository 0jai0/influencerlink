const messaging = require("./firebaseAdmin"); // Import Firebase Admin SDK
const Token = require("../../models/Token");
// Function to send push notifications
async function sendPushNotification(token, title, body) {
  const message = {
    notification: { title, body },
    token,
  };

  try {
    await messaging.send(message);
    console.log("Notification sent successfully");
    return { success: true, message: "Notification sent" };
  } catch (error) {
    console.error("Error sending notification", error);
    return { success: false, error: error.message };
  }
}

// Function to handle message sending
async function sendMessage(req, res) {
    try {
      const { sender, receiver, message } = req.body;
  
     
  
      // Get receiver's FCM token
      const receiverUser = await Token.findOne({ userId: receiver });
  
      if (!receiverUser) {
        return res.status(404).json({ success: false, message: "Receiver not found" });
      }
  
      // Send push notification
      const notificationResponse = await sendPushNotification(
        receiverUser.fcmToken,
        `Message from ${sender}`,
        message
      );
  
      res.json(notificationResponse);
    } catch (error) {
      console.error("Error in sendMessage:", error);
      res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
  }


async function storeUserFCMToken(req, res) {
    try {
      const { userId, token } = req.body;
      console.log(userId, token);
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
  }
// Mock function to get FCM token from database
async function getUserFCMToken(userId) {
    const user = await Token.findOne({ userId });
    return user ? user.fcmToken : null;
  }

module.exports = { sendMessage,storeUserFCMToken,getUserFCMToken  };

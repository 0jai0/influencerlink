const cron = require("node-cron");
const nodemailer = require("nodemailer");
const Message = require("../models/Message");
const User = require("../models/PageUser");

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "buyfish1027@gmail.com", // Your Gmail address
    pass: "lokrurnrtjzmgnzm", // App Password (NOT your Gmail password)
  },
});

// Schedule a cron job to run every 10 minutes
cron.schedule("*/10 * * * *", async () => {
  console.log("Checking for unread messages...");

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

    // Find messages where:
    // - `chat.messageStatus` is "unread"
    // - `chat.status` is "send"
    // - `chat.timestamp` is more than 1 hour old
    const messages = await Message.find({
      chat: {
        $elemMatch: {
          messageStatus: "unread",
          status: "send",
          timestamp: { $lte: oneHourAgo },
        },
      },
    });

    if (messages.length === 0) {
      console.log("No unread messages to notify.");
      return;
    }

    const emailPromises = messages.map(async (msg) => {
      const receiverEmail = await getUserEmail(msg.receiver);
      if (!receiverEmail) return null; // Skip if email not found

      const mailOptions = {
        from: "buyfish1027@gmail.com", // Ensure correct sender
        to: receiverEmail,
        subject: "You have an unread message!",
        text: `Hello, you have an unread message from ${msg.sender}. Please check your messages.`,
      };

      return transporter.sendMail(mailOptions);
    });

    await Promise.all(emailPromises);
    console.log("Unread message notifications sent successfully.");
  } catch (error) {
    console.error(`Error in cron job: ${error.message}`);
  }
});

// Function to get the user's email from the database
async function getUserEmail(userId) {
  try {
    const user = await User.findById(userId).select("email"); // Optimize query
    return user?.email || null;
  } catch (error) {
    console.error(`Error fetching user email: ${error.message}`);
    return null;
  }
}

module.exports = cron;

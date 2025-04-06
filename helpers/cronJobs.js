const cron = require("node-cron");
const nodemailer = require("nodemailer");
const Message = require("../models/Message");

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: "smtpout.secureserver.net",
  port: 465,
  secure: true,
  auth: {
    user: "support@promoterlink.com",
    pass: "Kiranmjv1027@",
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Run daily at 5 PM
cron.schedule("0 17 * * *", async () => {
  //console.log("Daily 5 PM: Checking for unread messages...");
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    // Find messages with unread sent messages >24 hours old
    const messages = await Message.find({
      "chat": {
        $elemMatch: {
          "status": "sent",
          "messageStatus": "unread",
          "timestamp": { $lte: twentyFourHoursAgo },
          "Notification": { $lt: 2 } // Only find messages with <2 notifications
        }
      }
    }).populate("sender receiver");

    if (!messages.length) {
      //console.log("No qualifying messages found.");
      return;
    }

    // Track notified users to avoid duplicates
    const notifiedUsers = new Set();

    // Process each message
    for (const msg of messages) {
      // Skip if we've already notified this user
      if (notifiedUsers.has(msg.receiver._id.toString())) continue;

      // Check only the most recent message (last in array)
      const recentChat = msg.chat[msg.chat.length - 1];
      
      if (recentChat.status === "sent" &&
          recentChat.messageStatus === "unread" &&
          recentChat.timestamp <= twentyFourHoursAgo &&
          (!recentChat.Notification || recentChat.Notification < 2)) {
        
        try {
          // Send email notification
          await transporter.sendMail({
            from: '"PromoterLink Notifications" <support@promoterlink.com>',
            to: msg.receiver.email,
            subject: `💌 Unread message from ${msg.sender.ownerName || 'a connection'}`,
            html: `
              <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e5e5; border-radius: 8px;">
                <div style="background: linear-gradient(to right, #1FFFE0, #249BCA); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
  <img src="https://promoterlink.com/logo.png" alt="PromoterLink" style="height: 40px;">
</div>

                <div style="padding: 30px;">
                  <h2 style="color: #111827; margin-top: 0;">You have an unread message</h2>
                  
                  <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0;">
                    <p style="font-size: 16px; color: #374151; margin: 0 0 10px 0;">
                      <strong>From:</strong> ${msg.sender.ownerName || 'A connection'}
                    </p>
                    <p style="font-size: 16px; color: #374151; margin: 0;">
                      <strong>Message:</strong> "${recentChat.content}"
                    </p>
                    <p style="color: #6b7280; font-size: 14px; margin-top: 10px;">
                      <em>Received ${formatTimeSince(recentChat.timestamp)} ago</em>
                    </p>
                  </div>
                  
                  <a href="https://promoterlink.com/MessagingApp/${msg.receiver._id}" 
                     style="display: inline-block; background: linear-gradient(to right, #1FFFE0, #249BCA); color: white; 
                            padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                            font-weight: 600; margin: 20px 0;">
                    View Message
                  </a>
                </div>
                
                <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e5e5;">
                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} PromoterLink. All rights reserved.
                  </p>
                </div>
              </div>
            `,
            text: `You have an unread message from ${msg.sender.ownerName || 'a connection'}:
            
"${recentChat.content}"

Received ${formatTimeSince(recentChat.timestamp)} ago.

View message: https://promoterlink.com/MessagingApp/${msg.receiver._id}

© ${new Date().getFullYear()} PromoterLink`
          });

          // Update notification count
          recentChat.Notification = (recentChat.Notification || 0) + 1;
          await msg.save();
          
          // Mark user as notified
          notifiedUsers.add(msg.receiver._id.toString());
          
          //console.log(`Sent daily notification to ${msg.receiver.email}`);
        } catch (error) {
          console.error(`Failed to send to ${msg.receiver.email}:`, error);
        }
      }
    }

    //console.log(`Daily notifications sent to ${notifiedUsers.size} users`);
  } catch (error) {
    console.error("Daily notification job failed:", error);
  }
});

// Helper function to format time duration
function formatTimeSince(date) {
  const hours = Math.floor((Date.now() - date) / (1000 * 60 * 60));
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''}`;
}
const Message = require("../models/Message");
const User = require("../models/User"); // Assuming you have a User model
const mongoose = require("mongoose");

const setupSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Handle user joining their private room
    socket.on("join", async (userId) => {
      if (userId) {
        socket.join(userId);
        console.log(`User ${userId} joined their room`);

        // Update user's online status
        try {
          if (mongoose.isValidObjectId(userId)) {
            await User.findByIdAndUpdate(userId, { isOnline: true }, { new: true });
            console.log(`User ${userId} is now online`);
            io.emit("user_status", { userId, isOnline: true }); // Notify all clients
          } else {
            console.error(`Invalid userId: ${userId}`);
          }
        } catch (error) {
          console.error("Error updating user online status:", error);
        }
      }
    });

    // Handle sending messages
    socket.on("send_message", async (data, callback) => {
      try {
        const { sender, receiver, content } = data;

        // Validate incoming data
        if (!sender || !receiver || !content) {
          callback({ status: "error", error: "Invalid message data" });
          return;
        }

        // Check if a message thread exists between sender and receiver
        let messageThread = await Message.findOne({ sender, receiver });

        if (messageThread) {
          // Add the new message to the existing chat array
          messageThread.chat.push({
            content,
            status: "sent",
            timestamp: new Date(),
          });
          await messageThread.save();
        } else {
          // Create a new message thread if none exists
          messageThread = new Message({
            sender,
            receiver,
            chat: [
              {
                content,
                status: "sent",
                timestamp: new Date(),
              },
            ],
          });
          await messageThread.save();
        }

        let messageThread1 = await Message.findOne({ sender: receiver, receiver: sender });

        if (messageThread1) {
          // Add the new message to the existing chat array
          messageThread1.chat.push({
            content,
            status: "received",
            timestamp: new Date(),
          });
          await messageThread1.save();
        } else {
          // Create a new message thread if none exists
          messageThread1 = new Message({
            sender: receiver,
            receiver: sender,
            chat: [
              {
                content,
                status: "received",
                timestamp: new Date(),
              },
            ],
          });
          await messageThread1.save();
        }

        // Emit the message to the receiver's room
        io.to(receiver).emit("receive_message", {
          sender,
          receiver,
          content,
          timestamp: new Date(),
          status: "received",
        });

        callback({ status: "ok", message: messageThread }); // Acknowledge success
      } catch (error) {
        console.error("Error saving message:", error);
        callback({ status: "error", error: "Failed to save message" });
      }
    });

    // Handle marking messages as "read"
    socket.on("message_read", async ({ sender, receiver }) => {
      try {
        if (!mongoose.isValidObjectId(sender) || !mongoose.isValidObjectId(receiver)) {
          return console.error("Invalid sender or receiver ID");
        }

        // Update sender's thread (mark messages as read)
        await Message.updateOne(
          { sender, receiver, "chat.status": "sent" },
          { $set: { "chat.$[elem].status": "read" } },
          { arrayFilters: [{ "elem.status": "sent" }] }
        );

        // Update receiver's thread (mark messages as read)
        await Message.updateOne(
          { sender: receiver, receiver: sender, "chat.status": "received" },
          { $set: { "chat.$[elem].status": "read" } },
          { arrayFilters: [{ "elem.status": "received" }] }
        );

        // Notify sender that their message was read
        io.to(sender).emit("message_read", { sender, receiver });

        console.log(`Messages from ${sender} to ${receiver} marked as read`);
      } catch (error) {
        console.error("Error updating message status to read:", error);
      }
    });

    // Handle user disconnecting
    socket.on("disconnect", async () => {
      console.log("Client disconnected:", socket.id);

      // Find user who disconnected
      const userRooms = [...socket.rooms].filter((room) => room !== socket.id);

      for (const userId of userRooms) {
        try {
          if (mongoose.isValidObjectId(userId)) {
            await User.findByIdAndUpdate(userId, { isOnline: false });
            console.log(`User ${userId} is now offline`);
            io.emit("user_status", { userId, isOnline: false }); // Notify all clients
          }
        } catch (error) {
          console.error("Error updating user offline status:", error);
        }
      }
    });
  });
};

module.exports = setupSocket;

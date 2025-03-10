const Message = require("../../models/Message");
const User = require("../../models/PageUser");

// Send a message
const sendMessage = async (req, res) => {
  const { sender, receiver, content } = req.body;

  try {
    // Check if a message between sender and receiver already exists (A to B)
    let messageAtoB = await Message.findOne({ sender, receiver });

    if (messageAtoB) {
      // Add the new message to the existing chat
      messageAtoB.chat.push({ content, status: 'sent', timestamp: new Date() });
      await messageAtoB.save();
    } else {
      // Create a new message if no existing chat is found
      messageAtoB = new Message({
        sender,
        receiver,
        chat: [{ content, status: 'sent', timestamp: new Date() }]
      });
      await messageAtoB.save();
    }

    // Check if a message between receiver and sender already exists (B to A)
    let messageBtoA = await Message.findOne({ sender: receiver, receiver: sender });

    if (messageBtoA) {
      messageBtoA.chat.push({ content, status: 'received', timestamp: new Date() });
      await messageBtoA.save();
    } else {
      messageBtoA = new Message({
        sender: receiver,
        receiver: sender,
        chat: [{ content, status: 'recevied', timestamp: new Date() }]
      });
      await messageBtoA.save();
    }

    res.status(201).json({ message: 'Message sent and stored successfully in both directions.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Get conversation between two users
const getConversation = async (req, res) => {
  const { userId1, userId2 } = req.params;

  try {
    const messageThreads = await Message.find({
      $or: [
        { sender: userId1, receiver: userId2 },
      ]
    });

    // Merge chat arrays from both thread documents
    const allMessages = [];
    messageThreads.forEach(thread => {
      thread.chat.forEach(chatItem => {
        // Attach sender and receiver info from the parent thread.
        allMessages.push({
          ...chatItem.toObject(),
          sender: thread.sender.toString(),
          receiver: thread.receiver.toString()
        });
      });
    });

    // Sort messages by timestamp in ascending order.
    allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.status(200).json({ success: true, conversation: allMessages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Mark messages as read
const markAsRead = async (req, res) => {
  const { senderId, receiverId } = req.body;

  try {
    await Message.updateMany(
      { sender: senderId, receiver: receiverId, status: { $ne: 'read' } },
      { $set: { status: 'read' } }
    );

    res.status(200).json({ success: true, message: "Messages marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update message status", error: error.message });
  }
};

module.exports = { sendMessage, getConversation, markAsRead };

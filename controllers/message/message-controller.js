const Message = require("../../models/Message");
const User = require("../../models/PageUser");

// Send a message
const sendMessage = async (req, res) => {
  const { sender, receiver, content } = req.body;

  try {
    const timestamp = new Date();

    // Check if a message between sender and receiver already exists (A to B)
    let messageAtoB = await Message.findOne({ sender, receiver });

    if (messageAtoB) {
      messageAtoB.chat.push({ content, status: 'sent', messageStatus: 'unread', timestamp });
      await messageAtoB.save();
    } else {
      messageAtoB = new Message({
        sender,
        receiver,
        chat: [{ content, status: 'sent', messageStatus: 'unread', timestamp }]
      });
      await messageAtoB.save();
    }

    // Check if a message between receiver and sender already exists (B to A)
    let messageBtoA = await Message.findOne({ sender: receiver, receiver: sender });

    if (messageBtoA) {
      messageBtoA.chat.push({ content, status: 'received', messageStatus: 'unread', timestamp });
      await messageBtoA.save();
    } else {
      messageBtoA = new Message({
        sender: receiver,
        receiver: sender,
        chat: [{ content, status: 'received', messageStatus: 'unread', timestamp }]
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
  const { sender, receiver } = req.body;

  try {
    // Update all unread messages in the chat
    await Message.updateMany(
      { sender, receiver, "chat.messageStatus": "unread" },
      { $set: { "chat.$[].messageStatus": "read" } } // Update all unread messages
    );

    console.log("Messages marked as read");
    res.status(200).json({ message: "Messages marked as read." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



module.exports = { sendMessage, getConversation, markAsRead };

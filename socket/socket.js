const Message = require('../models/Message');

const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join user's private room
    socket.on('join', (userId) => {
      if (userId) {
        socket.join(userId);
        console.log(`User ${userId} joined their room`);
      }
    });

    // Handle sending messages
    socket.on('send_message', async (data, callback) => {
      try {
        const { sender, receiver, content } = data;

        // Validate incoming data
        if (!sender || !receiver || !content) {
          callback({ status: 'error', error: 'Invalid message data' });
          return;
        }

        // Check if a message thread exists between sender and receiver
        let messageThread = await Message.findOne({ sender, receiver });

        if (messageThread) {
          // Add the new message to the existing chat array
          messageThread.chat.push({
            content,
            status: 'sent',
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
                status: 'sent',
                timestamp: new Date(),
              },
            ],
          });
          await messageThread.save();
        }
        let messageThread1 = await Message.findOne({ sender:receiver, receiver:sender });

        if (messageThread1) {
          // Add the new message to the existing chat array
          messageThread1.chat.push({
            content,
            status: 'received',
            timestamp: new Date(),
          });
          await messageThread1.save();
        } else {
          // Create a new message thread if none exists
          messageThread1 = new Message({
            sender:receiver,
            receiver:sender,
            chat: [
              {
                content,
                status: 'received',
                timestamp: new Date(),
              },
            ],
          });
          await messageThread1.save();
        }

        // Emit the message to the receiver's room
        io.to(receiver).emit('receive_message', {
          sender,
          receiver,
          content,
          timestamp: new Date(),
          status: 'received',
        });

        

        callback({ status: 'ok', message: messageThread }); // Acknowledge success
      } catch (error) {
        console.error('Error saving message:', error);
        callback({ status: 'error', error: 'Failed to save message' });
      }
    });

    // Handle disconnects 
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
};

module.exports = setupSocket;
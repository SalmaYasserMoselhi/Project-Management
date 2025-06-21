// backend/socketServer.js

// !!! IMPORTANT: Adjust these paths to your actual Mongoose model files !!!
// Example: const Message = require('../models/messageModel');
// Example: const Conversation = require('../models/conversationModel');
const Message = require('./models/messageModel');
const Conversation = require('./models/conversationModel');
const User = require('./models/userModel'); // Assuming this path is correct for your User model

let onlineUsers = [];
let ioInstance;

module.exports = function (socket, io) {
  // Store the io instance for later use (ensures it's accessible globally if needed)
  if (io && !ioInstance) {
    ioInstance = io;
    if (!global.io) {
      global.io = io;
      console.log('Socket.IO instance set globally from socketServer.js');
    }
  }

  // --- Connection & User Management ---
  socket.on('join', async (userId) => {
    // Expecting userId here, as passed from frontend
    console.log(`Backend: User ${userId} attempting to join.`);
    socket.join(userId); // User joins a room named after their own ID
    socket.userId = userId; // Store userId on the socket for easy access

    // Add joined users to online users list
    if (!onlineUsers.some((u) => u.userId === userId)) {
      onlineUsers.push({ userId: userId, socketId: socket.id });
      console.log(
        `Backend: User ${userId} is now online. Total online: ${onlineUsers.length}`
      );
      await User.findByIdAndUpdate(userId, { status: 'online' }); // Update user status in DB
    }

    // Send updated online users list to all connected clients
    io.emit('get-online-users', onlineUsers);

    // Send socket ID back (if frontend needs it, usually for debugging)
    io.emit('setup socket', socket.id);
  });

  socket.on('disconnect', async (reason) => {
    console.log(`Backend: Socket ${socket.id} disconnected. Reason: ${reason}`);
    const disconnectedUser = onlineUsers.find(
      (user) => user.socketId === socket.id
    );

    onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id);

    if (disconnectedUser) {
      console.log(`Backend: User ${disconnectedUser.userId} went offline.`);
      await User.findByIdAndUpdate(disconnectedUser.userId, {
        status: 'offline',
      });
    }

    // Send updated online users to frontend
    io.emit('get-online-users', onlineUsers);
  });

  socket.on('join conversation', (conversationId) => {
    console.log(
      `Backend: Socket ${socket.id} joined conversation room: ${conversationId}`
    );
    socket.join(conversationId); // User joins the specific conversation room
  });

  // --- Message Handling ---
  socket.on('send message', async (messageData, callback) => {
    // Added callback for acknowledgement
    console.log('Backend: Received "send message" event. Data:', messageData);
    try {
      // Input Validation
      if (
        !messageData.conversationId ||
        !messageData.sender ||
        !messageData.sender._id ||
        !messageData.content
      ) {
        console.error(
          'Backend: Invalid message data received. Missing required fields.',
          messageData
        );
        if (callback)
          callback({ success: false, error: 'Invalid message data' });
        return;
      }

      // 1. Save the message to the database
      const newMessage = await Message.create({
        sender: messageData.sender._id,
        conversation: messageData.conversationId,
        message: messageData.content, // Changed from 'content' to 'message' to match schema
        isEmoji: messageData.isEmoji || false,
        // Add other fields (e.g., files) if your messageData contains them and schema supports
      });
      console.log(
        'Backend: Message saved to DB. New message ID:',
        newMessage._id
      );

      // 2. Populate necessary fields for the frontend (sender and conversation details)
      // This step is crucial for the frontend to render the message correctly with user info.
      const populatedMessage = await Message.findById(newMessage._id)
        .populate('sender', 'fullName username email avatar') // Populate sender fields
        .populate('conversation', 'name isGroup users participants'); // Populate conversation fields, including its users/participants for broadcast logic

      if (!populatedMessage) {
        throw new Error('Failed to retrieve populated message after saving.');
      }
      console.log(
        'Backend: Message populated. Sender:',
        populatedMessage.sender?.fullName,
        'Conversation:',
        populatedMessage.conversation?.name
      );

      // 3. Update the lastMessage field in the Conversation model
      // This keeps the chat list updated on the frontend
      await Conversation.findByIdAndUpdate(
        messageData.conversationId,
        { lastMessage: populatedMessage._id, updatedAt: new Date() },
        { new: true } // Return the updated document
      );
      console.log(
        'Backend: Conversation lastMessage updated for ID:',
        messageData.conversationId
      );

      // 4. Emit the *populated* message to all relevant users in the conversation
      const conversation = populatedMessage.conversation;
      const recipients = conversation.users || conversation.participants; // Use 'users' or 'participants' based on your schema

      if (!recipients || recipients.length === 0) {
        console.warn(
          `Backend: No recipients found for conversation ${conversation._id}. Message saved but not broadcast.`
        );
        if (callback)
          callback({
            success: true,
            message: 'Message saved but no recipients to broadcast to.',
          });
        return;
      }

      console.log(
        `Backend: Broadcasting 'receive message' to ${recipients.length} participants for conversation ${conversation._id}`
      );
      recipients.forEach((user) => {
        if (user && user._id) {
          // Send to the user's personal room. This ensures delivery to all devices.
          io.to(String(user._id)).emit('receive message', populatedMessage);
          console.log(
            `Backend: Emitted 'receive message' to user room: ${user._id}`
          );
        } else {
          console.warn(
            'Backend: Invalid user object found in recipients list for broadcast:',
            user
          );
        }
      });

      // Send acknowledgement back to the sender's client
      if (callback)
        callback({
          success: true,
          message: 'Message processed and broadcasted.',
        });
    } catch (error) {
      console.error(
        'Backend: !!! FATAL ERROR in "send message" handler:',
        error
      );
      if (callback)
        callback({
          success: false,
          error: error.message || 'Server error during message processing.',
        });
    }
  });

  socket.on('delete message', async (data) => {
    const { messageId, conversationId, deletedBy } = data;
    console.log(
      `Backend: Received 'delete message' for Message ${messageId} from user ${deletedBy} in conversation ${conversationId}`
    );

    try {
      // Optional: Implement actual database deletion logic here if not already handled by a REST endpoint
      // For example: await Message.findByIdAndDelete(messageId);
      // console.log(`Backend: Message ${messageId} deleted from DB.`);

      // Broadcast the deletion event to all participants in the conversation room
      io.to(conversationId).emit('message deleted', messageId);
      console.log(
        `Backend: Broadcasted 'message deleted' for ${messageId} to conversation ${conversationId}`
      );
      // If an acknowledgment is expected from the frontend, you'd add a callback parameter to the socket.on
    } catch (error) {
      console.error(`Backend: Error deleting message ${messageId}:`, error);
      // Optionally emit an error back to the client that requested deletion
    }
  });

  // --- Typing Indicators ---
  socket.on('typing', (conversationId) => {
    console.log(
      `Backend: User ${
        socket.userId || 'unknown'
      } in ${conversationId} is typing.`
    );
    // Broadcast to everyone in the conversation room except the sender
    socket
      .to(conversationId)
      .emit('typing', { conversationId, userId: socket.userId }); // Pass userId for context
  });

  socket.on('stop typing', (conversationId) => {
    console.log(
      `Backend: User ${
        socket.userId || 'unknown'
      } in ${conversationId} stopped typing.`
    );
    // Broadcast to everyone in the conversation room except the sender
    socket
      .to(conversationId)
      .emit('stop typing', { conversationId, userId: socket.userId }); // Pass userId for context
  });

  // --- Call Features (No changes, included for completeness) ---
  socket.on('call user', (data) => {
    console.log(
      `Backend: Received 'call user' from ${data.from} to ${data.userToCall}`
    );
    let userId = data.userToCall;
    let userSocketId = onlineUsers.find((user) => user.userId == userId);
    if (userSocketId) {
      io.to(userSocketId.socketId).emit('call user', {
        signal: data.signal,
        from: data.from,
        name: data.name,
        avatar: data.avatar,
      });
      console.log(
        `Backend: Emitted 'call user' to socket ${userSocketId.socketId}`
      );
    } else {
      console.warn(`Backend: User to call (${userId}) not found online.`);
    }
  });

  socket.on('answer call', (data) => {
    console.log(`Backend: Received 'answer call' to ${data.to}`);
    io.to(data.to).emit('call accepted', data.signal);
    console.log(`Backend: Emitted 'call accepted' to socket ${data.to}`);
  });

  socket.on('end call', (id) => {
    console.log(`Backend: Received 'end call' for user ${id}`);
    io.to(id).emit('end call');
    console.log(`Backend: Emitted 'end call' to socket ${id}`);
  });

  // --- NOTIFICATION HANDLERS (No changes, included for completeness) ---
  socket.on('join board', (boardId) => {
    socket.join(`board:${boardId}`);
    console.log(`Backend: User joined board room: board:${boardId}`);
  });

  socket.on('leave board', (boardId) => {
    socket.leave(`board:${boardId}`);
    console.log(`Backend: User left board room: board:${boardId}`);
  });

  socket.on('join workspace', (workspaceId) => {
    socket.join(`workspace:${workspaceId}`);
    console.log(
      `Backend: User joined workspace room: workspace:${workspaceId}`
    );
  });

  socket.on('leave workspace', (workspaceId) => {
    socket.leave(`workspace:${workspaceId}`);
    console.log(`Backend: User left workspace room: workspace:${workspaceId}`);
  });

  socket.on('notification read', ({ userId, notificationId }) => {
    socket.to(userId).emit('notification read', notificationId);
    console.log(`Backend: Notification ${notificationId} read by ${userId}`);
  });

  socket.on('all notifications read', ({ userId }) => {
    socket.to(userId).emit('all notifications read');
    console.log(`Backend: All notifications read by ${userId}`);
  });

  // Utility method to get the io instance from outside
  module.exports.getIO = function () {
    return ioInstance;
  };

  return socket; // For testing purposes, if you have unit tests for socket events
};

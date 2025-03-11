const socketIo = require('socket.io');
const Message = require('./models/chatModel');
const Conversation = require('./models/conversationModel');
const jwt = require('jsonwebtoken');
const User = require('./models/userModel');

// This function takes the HTTP server instance
const setupSocketServer = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Map to store online users
  const onlineUsers = new Map();

  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if user exists
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach user to socket
      socket.user = {
        id: user._id,
        name: user.name,
        email: user.email,
      };

      next();
    } catch (error) {
      return next(new Error('Authentication error: ' + error.message));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.id}`);

    // Add user to online users map
    onlineUsers.set(socket.user.id.toString(), socket.id);

    // Emit online users to all clients
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));

    // Join personal room for direct messages
    socket.join(socket.user.id.toString());

    // Join workspace rooms if specified
    if (socket.handshake.query.workspaceId) {
      socket.join(`workspace:${socket.handshake.query.workspaceId}`);
    }

    // Join board rooms if specified
    if (socket.handshake.query.boardId) {
      socket.join(`board:${socket.handshake.query.boardId}`);
    }

    // Handle joining conversation rooms
    socket.on('joinConversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`${socket.user.name} joined conversation: ${conversationId}`);
    });

    // Handle new message
    socket.on('sendMessage', async (messageData) => {
      try {
        const { conversationId, content, attachments } = messageData;

        // Get conversation
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        // Check if user is part of conversation
        if (!conversation.participants.includes(socket.user.id)) {
          socket.emit('error', {
            message: 'You are not part of this conversation',
          });
          return;
        }

        // Create message
        const recipients = conversation.participants.filter(
          (p) => p.toString() !== socket.user.id.toString()
        );

        const newMessage = await Message.create({
          sender: socket.user.id,
          recipient: conversation.isGroup ? null : recipients[0],
          workspaceId: conversation.workspaceId,
          boardId: conversation.boardId,
          content,
          attachments: attachments || [],
        });

        // Update conversation with last message
        conversation.lastMessage = newMessage._id;
        await conversation.save();

        const populatedMessage = await Message.findById(
          newMessage._id
        ).populate({
          path: 'sender',
          select: 'name photo',
        });

        // Emit message to conversation room
        io.to(`conversation:${conversationId}`).emit(
          'newMessage',
          populatedMessage
        );

        // Send notifications to recipients who are online
        recipients.forEach((recipientId) => {
          const recipientSocketId = onlineUsers.get(recipientId.toString());
          if (recipientSocketId) {
            io.to(recipientSocketId).emit('messageNotification', {
              conversationId,
              message: populatedMessage,
              sender: socket.user,
            });
          }
        });
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      const { conversationId } = data;

      // Emit to all in conversation except sender
      socket.to(`conversation:${conversationId}`).emit('userTyping', {
        user: socket.user,
        conversationId,
      });
    });

    // Handle stop typing
    socket.on('stopTyping', (data) => {
      const { conversationId } = data;

      socket.to(`conversation:${conversationId}`).emit('userStoppedTyping', {
        user: socket.user,
        conversationId,
      });
    });

    // Handle read receipts
    socket.on('markAsRead', async (data) => {
      try {
        const { conversationId } = data;

        await Message.updateMany(
          {
            conversationId: conversationId,
            recipient: socket.user.id,
            read: false,
          },
          { read: true }
        );

        socket.to(`conversation:${conversationId}`).emit('messagesRead', {
          user: socket.user,
          conversationId,
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.id}`);

      // Remove user from online users map
      onlineUsers.delete(socket.user.id.toString());

      // Emit updated online users
      io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    });
  });

  return io;
};

module.exports = setupSocketServer;

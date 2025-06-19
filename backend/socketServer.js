let onlineUsers = [];
let ioInstance;
const userController = require('./controllers/userController');
const User = require('./models/userModel');

module.exports = function (socket, io) {
  // Store the io instance for later use
  if (io && !ioInstance) {
    ioInstance = io;
    // Make it available globally if not already done
    if (!global.io) {
      global.io = io;
      console.log('Socket.IO instance set globally from socketServer');
    }
  }

  // user join or open the chat app
  socket.on('join', async (user) => {
    socket.join(user);
    await User.findByIdAndUpdate(user, { status: 'online' });

    // add joined users to online users
    if (!onlineUsers.some((u) => u.userId === user)) {
      console.log(`user ${user} is now online`);
      onlineUsers.push({ userId: user, socketId: socket.id });
    }

    // send online users to frontend
    io.emit('get-online-users', onlineUsers);

    // send socket id
    io.emit('setup socket', socket.id);
  });

  // socket disconnect
  socket.on('disconnect', async () => {
    const disconnectedUser = onlineUsers.find(
      (user) => user.socketId === socket.id
    );
    onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id);

    if (disconnectedUser) {
      await User.findByIdAndUpdate(disconnectedUser.userId, {
        status: 'offline',
      });
    }

    console.log('user disconnected');
    io.emit('get-online-users', onlineUsers);
  });

  // user open the conversation
  socket.on('join conversation', (conversation) => {
    socket.join(conversation);
    // console.log('user has joined the conversation: ', conversation);
  });

  // send and receive messages
  socket.on('send message', (message) => {
    let conversation = message.conversation;
    if (!conversation.users) return;

    conversation.users.forEach((user) => {
      if (user._id === message.sender._id) return;
      socket.in(user._id).emit('receive message', message);
    });
  });

  socket.on('delete message', (data) => {
    const { messageId, conversationId, deletedBy } = data;

    console.log(
      `Message ${messageId} deleted from conversation ${conversationId} by user ${deletedBy}`
    );

    socket.to(conversationId).emit('message deleted', messageId);
  });

  // typing
  socket.on('typing', (conversation) => {
    socket.in(conversation).emit('typing', conversation);
  });

  socket.on('stop typing', (conversation) => {
    socket.in(conversation).emit('stop typing');
  });

  // call feature
  // call user
  socket.on('call user', (data) => {
    let userId = data.userToCall;
    let userSocketId = onlineUsers.find((user) => user.userId == userId);
    io.to(userSocketId.socketId).emit('call user', {
      signal: data.signal,
      from: data.from,
      name: data.name,
      avatar: data.avatar,
    });
  });

  // answer call
  socket.on('answer call', (data) => {
    io.to(data.to).emit('call accepted', data.signal);
  });

  // ending call
  socket.on('end call', (id) => {
    io.to(id).emit('end call');
  });

  // NOTIFICATION HANDLERS
  // User joins a board room to receive board-related notifications
  socket.on('join board', (boardId) => {
    socket.join(`board:${boardId}`);
    console.log(`User joined board room: board:${boardId}`);
  });

  // User leaves a board room
  socket.on('leave board', (boardId) => {
    socket.leave(`board:${boardId}`);
    console.log(`User left board room: board:${boardId}`);
  });

  // User joins a workspace room to receive workspace-related notifications
  socket.on('join workspace', (workspaceId) => {
    socket.join(`workspace:${workspaceId}`);
    console.log(`User joined workspace room: workspace:${workspaceId}`);
  });

  // User leaves a workspace room
  socket.on('leave workspace', (workspaceId) => {
    socket.leave(`workspace:${workspaceId}`);
    console.log(`User left workspace room: workspace:${workspaceId}`);
  });

  // Handle mark notification as read - sync across devices
  socket.on('notification read', ({ userId, notificationId }) => {
    // Broadcast to all user's devices that this notification was read
    socket.to(userId).emit('notification read', notificationId);
  });

  // Handle mark all notifications as read - sync across devices
  socket.on('all notifications read', ({ userId }) => {
    // Broadcast to all user's devices that all notifications were read
    socket.to(userId).emit('all notifications read');
  });

  // Utility method to get the io instance from outside
  module.exports.getIO = function () {
    return ioInstance;
  };

  // Return the socket server for testing purposes
  return socket;
};

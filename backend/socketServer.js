let onlineUsers = [];
module.exports = function (socket, io) {
  // user join or open the chat app
  socket.on('join', (user) => {
    socket.join(user);
    // add joined users to online users
    if (!onlineUsers.some((u) => u.userId === user)) {
      console.log(`user ${user} is now online`);
      onlineUsers.push({ userId: user, socketId: socket.id });
    }
    // send online users to frontend
    io.emit('get-online-users', onlineUsers);
  });
  // socket disconnect
  socket.on('disconnect', () => {
    onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id);
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
  // typing
  socket.on('typing', (conversation) => {
    socket.in(conversation).emit('typing', conversation);
  });
  socket.on('stop typing', (conversation) => {
    socket.in(conversation).emit('stop typing');
  });
};

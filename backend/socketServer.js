module.exports = function (socket) {
  // user join or open the chat app
  socket.on('join', (user) => {
    socket.join(user);
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
      socket.in(user._id).emit('message received', message);
    });
  });
};

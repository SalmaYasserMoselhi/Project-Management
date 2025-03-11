const Message = require('./../models/messageModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Conversation = require('../models/conversationModel');
const mongoose = require('mongoose');

const createMessage = async (data) => {
  let newMessage = await Message.create(data);
  if (!newMessage) {
    throw new AppError('Message creation failed', 400);
  }
  return newMessage;
};

const populateMessage = async (id) => {
  let msg = await Message.findById(id)
    .populate({
      path: 'sender',
      select: 'username avatar',
      model: 'User',
    })
    .populate({
      path: 'conversation',
      select: 'name isGroup users',
      model: 'Conversation',
      populate: {
        path: 'users',
        select: 'username email avatar',
        model: 'User',
      },
    });
  if (!msg) {
    throw new AppError('Message not found', 404);
  }
  return msg;
};

const updateLastMessage = async (convoId, msg) => {
  const updatedConvo = await Conversation.findByIdAndUpdate(convoId, {
    lastMessage: msg,
  });
  if (!updatedConvo) {
    throw new AppError('Conversation not found', 404);
  }
  return updatedConvo;
};
exports.sendMessage = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { message, convoId, files } = req.body;
  if (!convoId || (!message && !files)) {
    return next(
      new AppError('Please provide a conversation id and a message body', 400)
    );
  }
  const msgData = {
    sender: userId,
    message,
    conversation: convoId,
    files: files || [],
  };
  let newMessage = await createMessage(msgData);
  let populatedMessage = await populateMessage(newMessage._id);
  await updateLastMessage(convoId, newMessage);
  res.status(200).json({
    status: 'success',
    data: {
      populatedMessage,
    },
  });
});

const getConvoMessages = async (convoId) => {
  const messages = await Message.find({ conversation: convoId })
    .populate('sender', 'username avatar email')
    .populate('conversation');
  if (!messages) {
    throw new AppError('Oops something went wrong !!', 404);
  }
  return messages;
};

exports.getMessages = catchAsync(async (req, res, next) => {
  const convoId = req.params.convoId;

  if (!mongoose.Types.ObjectId.isValid(convoId)) {
    return next(new AppError('Invalid conversation ID', 400));
  }
  if (!convoId) {
    return next(new AppError('Please provide a conversation id', 400));
  }
  const messages = await getConvoMessages(convoId);

  res.status(200).json({
    status: 'success',
    results: messages.length,
    data: {
      messages,
    },
  });
});

const Message = require('./../models/messageModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Conversation = require('../models/conversationModel');
const mongoose = require('mongoose');
const Attachment = require('../models/attachmentModel');
const {
  uploadMultipleFiles,
  sanitizeFilename,
} = require('../Middlewares/fileUploadMiddleware');
// Add the middleware for file uploads
exports.uploadMessageFiles = uploadMultipleFiles().array('files', 5);

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

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

exports.sendMessage = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { message, convoId, files } = req.body;
  if (!convoId) {
    return next(new AppError('Please provide a conversation id', 400));
  }

  // Check if there's either a message or files
  if (!message && (!req.files || req.files.length === 0)) {
    return next(new AppError('Please provide a message or files', 400));
  }

  // Process uploaded files if any
  let fileAttachments = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const originalName =
        file.decodedOriginalName || sanitizeFilename(file.originalname);
      // Fix: Ensure size is properly stored as a number
      const fileSize = parseInt(file.size) || 0;

      const newFile = await Attachment.create({
        originalName: originalName,
        filename: file.filename,
        mimetype: file.mimetype,
        size: fileSize,
        path: file.path,
        entityType: 'chat',
        entityId: convoId,
        uploadedBy: userId,
      });

      fileAttachments.push({
        _id: newFile._id,
        originalName: originalName,
        mimetype: newFile.mimetype,
        size: fileSize, // Store as number
        formattedSize: formatFileSize(fileSize),
        url: `/api/v1/files/${newFile._id}/download`,
        filename: newFile.filename,
      });
    }
  }

  const msgData = {
    sender: userId,
    message,
    conversation: convoId,
    files: fileAttachments,
  };
  let newMessage = await createMessage(msgData);
  let populatedMessage = await populateMessage(newMessage._id);
  await updateLastMessage(convoId, newMessage);

  // Broadcast the file message to all users in the conversation via socket.io
  try {
    // Get the conversation to find all participants
    const conversation = await Conversation.findById(convoId);
    if (conversation) {
      const userIds = conversation.users || conversation.participants || [];

      // Get the global io instance
      const io = global.io;
      if (io) {
        console.log(
          `Broadcasting file message ${populatedMessage._id} to conversation ${convoId} users`
        );

        // Emit to each user in the conversation
        userIds.forEach((userId) => {
          io.to(String(userId)).emit('receive message', populatedMessage);
        });
      } else {
        console.warn(
          'Socket.io instance not available for file message broadcast'
        );
      }
    }
  } catch (err) {
    console.error('Error broadcasting file message via socket:', err);
    // Don't throw error here, as the message is already saved to DB
  }

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

exports.deleteMessage = catchAsync(async (req, res, next) => {
  const messageId = req.params.messageId;
  const userId = req.user.id;
  const message = await Message.findById(messageId);
  if (!message) {
    return next(new AppError('Message not found', 404));
  }
  if (message.sender.toString() !== userId) {
    return next(
      new AppError('You are not authorized to delete this message', 401)
    );
  }
  await Message.findByIdAndDelete(messageId);
  res.status(200).json({
    status: 'success',
    message: 'Message deleted successfully',
  });
});

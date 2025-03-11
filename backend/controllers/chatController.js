const Message = require('../models/chatModel');
const Conversation = require('../models/conversationModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getConversations = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  let query = { participants: { $in: [userId] } };

  // Filter by workspace if provided
  if (req.query.workspaceId) {
    query.workspaceId = req.query.workspaceId;
  }

  // Filter by board if provided
  if (req.query.boardId) {
    query.boardId = req.query.boardId;
  }

  const conversations = await Conversation.find(query)
    .populate({
      path: 'participants',
      select: 'name photo email',
    })
    .populate({
      path: 'lastMessage',
      select: 'content createdAt read',
    })
    .sort('-updatedAt');

  res.status(200).json({
    status: 'success',
    results: conversations.length,
    data: {
      conversations,
    },
  });
});

exports.getMessages = catchAsync(async (req, res, next) => {
  const { conversationId } = req.params;
  const userId = req.user.id;

  // Check if conversation exists and user is a participant
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    return next(new AppError('No conversation found with that ID', 404));
  }

  if (!conversation.participants.includes(userId)) {
    return next(
      new AppError('You are not a participant in this conversation', 403)
    );
  }

  const messages = await Message.find({
    $or: [
      {
        sender: userId,
        recipient: {
          $in: conversation.participants.filter(
            (p) => p.toString() !== userId.toString()
          ),
        },
      },
      {
        sender: {
          $in: conversation.participants.filter(
            (p) => p.toString() !== userId.toString()
          ),
        },
        recipient: userId,
      },
    ],
  })
    .populate({
      path: 'sender',
      select: 'name photo',
    })
    .sort('createdAt');

  // Mark messages as read
  await Message.updateMany(
    {
      sender: {
        $in: conversation.participants.filter(
          (p) => p.toString() !== userId.toString()
        ),
      },
      recipient: userId,
      read: false,
    },
    { read: true }
  );

  res.status(200).json({
    status: 'success',
    results: messages.length,
    data: {
      messages,
    },
  });
});

exports.createConversation = catchAsync(async (req, res, next) => {
  const { participants, workspaceId, boardId, isGroup, groupName } = req.body;
  const userId = req.user.id;

  // Ensure current user is included in participants
  if (!participants.includes(userId)) {
    participants.push(userId);
  }

  // For direct messages (non-group), check if conversation already exists
  if (!isGroup && participants.length === 2) {
    const existingConversation = await Conversation.findOne({
      participants: { $all: participants },
      isGroup: false,
    });

    if (existingConversation) {
      return res.status(200).json({
        status: 'success',
        data: {
          conversation: existingConversation,
        },
      });
    }
  }

  // Create new conversation
  const newConversation = await Conversation.create({
    participants,
    workspaceId,
    boardId,
    isGroup: isGroup || false,
    groupName: isGroup ? groupName : undefined,
    groupAdmin: isGroup ? userId : undefined,
  });

  const populatedConversation = await Conversation.findById(
    newConversation._id
  ).populate({
    path: 'participants',
    select: 'name photo email',
  });

  res.status(201).json({
    status: 'success',
    data: {
      conversation: populatedConversation,
    },
  });
});

exports.sendMessage = catchAsync(async (req, res, next) => {
  const { conversationId } = req.params;
  const { content, attachments } = req.body;
  const userId = req.user.id;

  // Check if conversation exists and user is a participant
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    return next(new AppError('No conversation found with that ID', 404));
  }

  if (!conversation.participants.includes(userId)) {
    return next(
      new AppError('You are not a participant in this conversation', 403)
    );
  }

  // Create message
  const recipients = conversation.participants.filter(
    (p) => p.toString() !== userId.toString()
  );

  const message = await Message.create({
    sender: userId,
    recipient: conversation.isGroup ? null : recipients[0],
    workspaceId: conversation.workspaceId,
    boardId: conversation.boardId,
    content,
    attachments: attachments || [],
  });

  // Update conversation with last message
  conversation.lastMessage = message._id;
  await conversation.save();

  const populatedMessage = await Message.findById(message._id).populate({
    path: 'sender',
    select: 'name photo',
  });

  res.status(201).json({
    status: 'success',
    data: {
      message: populatedMessage,
    },
  });
});

exports.getUnreadCount = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const unreadCount = await Message.countDocuments({
    recipient: userId,
    read: false,
  });

  res.status(200).json({
    status: 'success',
    data: {
      unreadCount,
    },
  });
});

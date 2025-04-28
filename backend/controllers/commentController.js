const Comment = require('../models/commentModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Card = require('../models/cardModel');
const List = require('../models/listModel');
const Board = require('../models/boardModel');
const notificationService = require('../utils/notificationService');

// Helper function to validate card access
const validateCardAccess = async (cardId, userId) => {
  const card = await Card.findById(cardId);
  if (!card) {
    throw new AppError('Card not found', 404);
  }

  const list = await List.findById(card.list);
  if (!list) {
    throw new AppError('List not found', 404);
  }

  const board = await Board.findById(list.board);
  if (!board) {
    throw new AppError('Board not found', 404);
  }

  const isMember = board.members.some(
    (member) => member.user.toString() === userId.toString()
  );

  if (!isMember) {
    throw new AppError(
      'You must be a board member to perform this action',
      403
    );
  }

  return { card, board };
};

// Create comment
exports.createComment = catchAsync(async (req, res, next) => {
  const { cardId } = req.params;
  const { text, mentions = [] } = req.body;

  // Validate access
  const { card } = await validateCardAccess(cardId, req.user._id);

  const comment = await Comment.create({
    text,
    cardId,
    author: req.user._id,
    mentions,
  });

  // Get the card's members to notify
  const cardMembers = card.members.map((member) => member.user.toString());

  // Send notifications for mentions
  if (global.io && mentions.length > 0) {
    const notificationService = require('../utils/notificationService');
    const User = require('../models/userModel');

    // Get the board and list for context
    const List = require('../models/listModel');
    const list = await List.findById(card.list);

    for (const mentionedUserId of mentions) {
      // Don't notify yourself
      if (mentionedUserId.toString() === req.user._id.toString()) {
        continue;
      }

      // Check if user exists
      const mentionedUser = await User.findById(mentionedUserId);
      if (!mentionedUser) continue;

      await notificationService.createNotification(
        global.io,
        mentionedUserId,
        req.user._id,
        'mention',
        'comment',
        comment._id,
        {
          entityType: 'card',
          entityName: card.title,
          cardId: card._id,
          boardId: board._id,
          boardName: board.name,
          listId: card.list,
          listName: list ? list.name : 'Unknown List',
          commentText: text.substring(0, 100),
        }
      );
    }
  }

  // Notify card members about the comment
  if (global.io && cardMembers.length > 0) {
    for (const memberId of cardMembers) {
      // Skip author and mentioned users
      if (
        memberId === req.user._id.toString() ||
        mentions.some((id) => id.toString() === memberId)
      ) {
        continue;
      }

      await notificationService.createNotification(
        global.io,
        memberId,
        req.user._id,
        'card_comment',
        'comment',
        comment._id,
        {
          cardTitle: card.title,
          cardId: card._id,
          boardId: board._id,
          boardName: board.name,
          commentText: text.substring(0, 100),
        }
      );
    }
  }

  // Log activity in card
  card.activity.push({
    action: 'commented',
    userId: req.user._id,
    data: {
      commentId: comment._id,
      text: text.substring(0, 50),
    },
  });
  await card.save();

  const populatedComment = await Comment.findById(comment._id)
    .populate('author', 'email firstName lastName avatar')
    .populate('mentions', 'email firstName lastName')
    .populate({
      path: 'replies',
      populate: [
        { path: 'author', select: 'email firstName lastName avatar' },
        { path: 'mentions', select: 'email firstName lastName' },
      ],
    });

  res.status(201).json({
    status: 'success',
    data: {
      comment: populatedComment,
    },
  });
});

// Get comments
exports.getComments = catchAsync(async (req, res, next) => {
  const { cardId } = req.params;

  // Validate access
  await validateCardAccess(cardId, req.user._id);

  const comments = await Comment.find({
    cardId,
    parentId: null,
  })
    .populate('author', 'email firstName lastName avatar')
    .populate('mentions', 'email firstName lastName')
    .populate({
      path: 'replies',
      populate: [
        { path: 'author', select: 'email firstName lastName avatar' },
        { path: 'mentions', select: 'email firstName lastName' },
      ],
    })
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: comments.length,
    data: {
      comments,
    },
  });
});

// Update comment
exports.updateComment = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { text, mentions = [] } = req.body;

  const comment = await Comment.findById(id);
  if (!comment) {
    return next(new AppError('Comment not found', 404));
  }

  // Validate access
  const { card } = await validateCardAccess(comment.cardId, req.user._id);

  // Verify ownership
  if (comment.author.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only edit your own comments', 403));
  }

  comment.text = text;
  comment.mentions = mentions;
  comment.edited = {
    isEdited: true,
    editedAt: new Date(),
  };
  await comment.save();

  // Log activity
  card.activity.push({
    action: 'updated_comment',
    userId: req.user._id,
    data: {
      commentId: comment._id,
      text: text.substring(0, 50),
    },
  });
  await card.save();

  const populatedComment = await Comment.findById(id)
    .populate('author', 'email firstName lastName avatar')
    .populate('mentions', 'email firstName lastName');

  res.status(200).json({
    status: 'success',
    data: {
      comment: populatedComment,
    },
  });
});

// Delete comment
exports.deleteComment = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const comment = await Comment.findById(id);
  if (!comment) {
    return next(new AppError('Comment not found', 404));
  }

  // Validate card access
  await validateCardAccess(comment.cardId, req.user._id);

  // Check if user is the comment author
  if (comment.author.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only delete your own comments', 403));
  }

  // Delete all replies if this is a parent comment
  if (!comment.parentId) {
    await Comment.deleteMany({
      parentId: comment._id,
      author: req.user._id, // Only delete own replies
    });
  }

  // Delete the comment
  await comment.deleteOne();

  // Log activity
  logCommentActivity(entity, req.user._id, {
    commentId: comment._id,
    action: 'deleted',
  });

  await entity.save();

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Add reply
exports.replyToComment = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { text, mentions = [] } = req.body;

  // Find the parent comment and validate it
  const parentComment = await Comment.findById(id).populate(
    'author',
    'email firstName lastName avatar'
  );

  if (!parentComment) {
    return next(new AppError('Parent comment not found', 404));
  }

  // Validate access
  const { card } = await validateCardAccess(parentComment.cardId, req.user._id);

  const reply = await Comment.create({
    text,
    cardId: parentComment.cardId,
    author: req.user._id,
    parentId: parentComment._id,
    mentions,
  });

  // Log activity
  card.activity.push({
    action: 'replied_comment',
    userId: req.user._id,
    data: {
      commentId: reply._id,
      parentId: parentComment._id,
      text: text.substring(0, 50),
    },
  });
  await card.save();
  const populatedReply = await Comment.findById(reply._id)
    .populate('author', 'email firstName lastName avatar')
    .populate('mentions', 'email firstName lastName');

  const updatedParent = await Comment.findById(id)
    .populate('author', 'email firstName lastName avatar')
    .populate('mentions', 'email firstName lastName')
    .populate({
      path: 'replies',
      populate: [
        { path: 'author', select: 'email firstName lastName avatar' },
        { path: 'mentions', select: 'email firstName lastName' },
      ],
    });

  res.status(201).json({
    status: 'success',
    data: {
      reply: populatedReply,
      parentComment: updatedParent,
    },
  });
});

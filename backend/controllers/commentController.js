const Comment = require('../models/commentModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Card = require('../models/cardModel');
const List = require('../models/listModel');
const Board = require('../models/boardModel');
const notificationService = require('../utils/notificationService');
const User = require('../models/userModel');
const activityService = require('../utils/activityService');

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
  const { card, board } = await validateCardAccess(cardId, req.user._id);
  const list = await List.findById(card.list);

  const comment = await Comment.create({
    text,
    cardId,
    author: req.user._id,
    mentions,
  });

  // Get the card's members to notify
  const cardMembers = card.members.map((member) => member.user.toString());

  // 1. Handle mention notifications
  for (const mentionedUserId of mentions) {
    // Skip self-mentions
    if (mentionedUserId.toString() === req.user._id.toString()) continue;

    await notificationService.createNotification(
      req.app.io,
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

  // 2. Notify card members
  for (const memberId of cardMembers) {
    // Skip author and mentioned users
    if (
      memberId === req.user._id.toString() ||
      mentions.includes(memberId)
    ) continue;

    await notificationService.createNotification(
      req.app.io,
      memberId,
      req.user._id,
      'comment_added',
      'comment',
      comment._id,
      {
        cardTitle: card.title,
        cardId: card._id,
        boardId: board._id,
        boardName: board.name,
        listName: list.name,
        commentText: text.substring(0, 100),
      }
    );
  }

  // Log activity in board instead of card
  await activityService.logCardActivity(
    board,
    req.user._id,
    'comment_added',
    card._id,
    {
      commentId: comment._id,
      text: text.substring(0, 50),
    }
  );

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
  const { card, board } = await validateCardAccess(comment.cardId, req.user._id);

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

  // Log activity in board
  await activityService.logCardActivity(
    board,
    req.user._id,
    'comment_updated',
    card._id,
    {
      commentId: comment._id,
      text: text.substring(0, 50),
    }
  );

  const populatedComment = await Comment.findById(id)
    .populate('author', 'email firstName lastName avatar')
    .populate('mentions', 'email firstName lastName');

  // Get card to find members to notify
  //  card = await Card.findById(comment.cardId);
  
  // Get card members excluding the comment author
  const cardMembers = card.members
    .filter(member => member.user.toString() !== req.user._id.toString())
    .map(member => member.user);
  
  // Notify card members about the comment update
  for (const memberId of cardMembers) {
    await notificationService.createNotification(
      req.app.io,
      memberId,
      req.user._id,
      'comment_updated',
      'comment',
      comment._id,
      {
        entityType: 'card',
        entityName: card.title,
        cardId: card._id,
        boardId: board._id,
        boardName: board.name,
        commentText: text.substring(0, 100),
      }
    );
  }
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

  // Validate card access and get board
  const { card, board } = await validateCardAccess(comment.cardId, req.user._id);

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

  // Get card members excluding the comment author
  const cardMembers = card.members
    .filter(member => member.user.toString() !== req.user._id.toString())
    .map(member => member.user);
  
  // Store comment text for notification before deletion
  const commentText = comment.text.substring(0, 100);
  
  // Notify card members about the comment deletion
  for (const memberId of cardMembers) {
    await notificationService.createNotification(
      req.app.io,
      memberId,
      req.user._id,
      'comment_deleted',
      'card', // Changed to card since comment will be deleted
      card._id,
      {
        entityType: 'card',
        entityName: card.title,
        boardId: board._id,
        boardName: board.name,
        commentText: commentText,
      }
    );
  }
  // Delete the comment
  await comment.deleteOne();

  // Log activity in board
  await activityService.logCardActivity(
    board,
    req.user._id,
    'comment_deleted',
    card._id,
    {
      commentId: comment._id,
    }
  );

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
  const { card, board } = await validateCardAccess(parentComment.cardId, req.user._id);

  const reply = await Comment.create({
    text,
    cardId: parentComment.cardId,
    author: req.user._id,
    parentId: parentComment._id,
    mentions,
  });

  // Log activity in board
  await activityService.logCardActivity(
    board,
    req.user._id,
    'comment_replied', // Changed to comment_replied instead of comment_added
    card._id,
    {
      commentId: reply._id,
      parentId: parentComment._id,
      text: text.substring(0, 50),
      isReply: true,
    }
  );

  // Get the list from the card
  const list = await List.findById(card.list);

  // Send notification to parent comment author if it's not the current user
  if (parentComment.author._id.toString() !== req.user._id.toString()) {
    await notificationService.createNotification(
      req.app.io,
      parentComment.author._id,
      req.user._id,
      'comment_replied', // Changed to comment_replied
      'comment',
      reply._id,
      {
        entityType: 'card',
        entityName: card.title,
        cardId: card._id,
        boardId: board._id,
        boardName: board.name,
        listId: card.list,
        listName: list ? list.name : 'Unknown List',
        commentText: text.substring(0, 100),
        isReply: true
      }
    );
  }

  // Handle mentions (just like in the createComment function)
  for (const mentionedUserId of mentions) {
    // Skip self-mentions
    if (mentionedUserId.toString() === req.user._id.toString()) continue;

    await notificationService.createNotification(
      req.app.io,
      mentionedUserId,
      req.user._id,
      'mention',
      'comment',
      reply._id,
      {
        entityType: 'card',
        entityName: card.title,
        cardId: card._id,
        boardId: board._id,
        boardName: board.name,
        listId: card.list,
        listName: list ? list.name : 'Unknown List',
        commentText: text.substring(0, 100),
        isReply: true
      }
    );
  }

  // Also notify card members (excluding the commenter and parent comment author)
  if (card.members && card.members.length > 0) {
    const cardMembers = card.members
      .filter(member => 
        member.user.toString() !== req.user._id.toString() && 
        member.user.toString() !== parentComment.author._id.toString() &&
        !mentions.includes(member.user.toString())
      )
      .map(member => member.user);

    for (const memberId of cardMembers) {
      await notificationService.createNotification(
        req.app.io,
        memberId,
        req.user._id,
        'comment_replied', // Changed to comment_replied
        'comment',
        reply._id,
        {
          cardTitle: card.title,
          cardId: card._id,
          boardId: board._id,
          boardName: board.name,
          listName: list ? list.name : 'Unknown List',
          commentText: text.substring(0, 100),
          isReply: true
        }
      );
    }
  }

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

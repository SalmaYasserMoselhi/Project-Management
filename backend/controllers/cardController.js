const Card = require('../models/cardModel');
const catchAsync = require('../utils/catchAsync');
const Board = require('../models/boardModel');
const List = require('../models/listModel');
const AppError = require('../utils/appError');

// Helper function to format card response
const formatCardResponse = (card) => ({
  id: card._id,
  title: card.title,
  description: card.description,
  position: card.position,
  cover: card.cover,
  status: card.status,
  dueDate: card.dueDate,
  members: card.members,
  watches: card.watches,
  labels: card.labels,
  customFields: card.customFields,
  checklists: card.checklists,
  attachments: card.attachments,
  comments: card.comments,
  activity: card.activity,
  lastActivity: card.lastActivity,
  createdAt: card.createdAt,
  updatedAt: card.updatedAt,
});

// Create Card
exports.createCard = catchAsync(async (req, res, next) => {
  const { listId } = req.body;

  // First, verify the list exists and get its board
  const list = await List.findById(listId);
  if (!list) {
    return next(new AppError('List not found', 404));
  }

  // First, verify the board exists and get its members
  const board = await Board.findById(list.board);

  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  const isMember = board.members.some(
    (member) => member.user.toString() === req.user._id.toString()
  );
  if (!isMember) {
    return next(
      new AppError('You must be a board member to create cards', 403)
    );
  }

  // Check if list has a card limit
  if (list.cardLimit) {
    const currentCardCount = await Card.countDocuments({ listId });
    if (currentCardCount >= list.cardLimit) {
      return next(new AppError('List card limit reached', 400));
    }
  }

  const card = await Card.create({
    ...req.body,
    boardId: list.board,
    createdBy: req.user._id,
    members: [
      {
        user: req.user._id,
        role: 'responsible',
        assignedBy: req.user._id,
        assignedAt: new Date(),
      },
    ],
  });

  // Add creation to activity
  card.activity.push({
    action: 'created',
    userId: req.user._id,
    data: { title: req.body.title },
  });

  await card.save();

  // Fetch the populated card for response
  const populatedCard = await Card.findById(card._id)
    .populate('members.user', 'email firstName lastName')
    .populate('createdBy', 'email firstName lastName');

  res.status(201).json({
    status: 'success',
    data: {
      card: formatCardResponse(populatedCard),
    },
  });
});

// Get Single Card
exports.getCard = catchAsync(async (req, res, next) => {
  const card = await Card.findById(req.params.cardId)
    .populate('members.user', 'email firstName lastName')
    .populate('comments.author', 'email firstName lastName')
    .populate('comments.mentions', 'email firstName lastName')
    .populate('comments.reactions.users', 'email firstName lastName')
    .populate('activity.userId', 'email firstName lastName');

  if (!card) {
    return next(new AppError('No card found with that ID', 404));
  }

  // Organize comments into a hierarchical structure
  const commentMap = new Map();
  const topLevelComments = [];

  // First pass: Create a map of all comments
  card.comments.forEach((comment) => {
    const commentObj = comment.toObject();
    commentObj.replies = [];
    commentMap.set(comment._id.toString(), commentObj);
  });

  // Second pass: Organize into hierarchy
  card.comments.forEach((comment) => {
    const commentId = comment._id.toString();
    const commentObj = commentMap.get(commentId);

    if (comment.parentId) {
      // This is a reply - add it to parent's replies
      const parentComment = commentMap.get(comment.parentId.toString());
      if (parentComment) {
        parentComment.replies.push(commentObj);
      }
    } else {
      // This is a top-level comment
      topLevelComments.push(commentObj);
    }
  });

  // Sort comments and replies by creation date
  const sortByDate = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);

  topLevelComments.sort(sortByDate);
  topLevelComments.forEach((comment) => {
    comment.replies.sort(sortByDate);
  });

  // Create the formatted response with organized comments
  const formattedCard = {
    ...formatCardResponse(card.toObject()),
    comments: topLevelComments, // Replace flat comments with hierarchical structure
  };

  res.status(200).json({
    status: 'success',
    data: {
      card: formattedCard,
    },
  });
});

// Update Card
exports.updateCard = catchAsync(async (req, res, next) => {
  const updateData = { ...req.body };
  delete updateData.createdBy; // Prevent modification of creator

  const card = await Card.findById(req.params.cardId);

  if (!card) {
    return next(new AppError('No card found with that ID', 404));
  }

  // Record changes in activity
  const changes = {};
  for (const [key, value] of Object.entries(updateData)) {
    if (card[key] !== value) {
      changes[key] = {
        from: card[key],
        to: value,
      };
    }
  }

  if (Object.keys(changes).length > 0) {
    card.activity.push({
      action: 'updated',
      userId: req.user._id,
      data: changes,
      timestamp: new Date(),
    });
  }

  // Update the card
  Object.assign(card, updateData);
  await card.save();

  res.status(200).json({
    status: 'success',
    data: {
      card,
    },
  });
});

// Delete card
exports.deleteCard = catchAsync(async (req, res, next) => {
  const card = await Card.findById(req.params.cardId);
  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  // Check board membership and permissions
  const board = await Board.findById(card.boardId);
  const member = board.members.find(
    (m) => m.user.toString() === req.user._id.toString()
  );
  if (!member || !['admin', 'owner'].includes(member.role)) {
    return next(
      new AppError('Only board admins and owners can delete cards', 403)
    );
  }

  await Card.findByIdAndDelete(card._id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Add Comment
exports.addComment = catchAsync(async (req, res, next) => {
  const { text, mentions = [], attachments = [] } = req.body;

  if (!text) {
    return next(new AppError('Comment text is required', 400));
  }

  const card = await Card.findById(req.params.cardId);

  if (!card) {
    return next(new AppError('No card found with that ID', 404));
  }

  card.comments.push({
    text,
    author: req.user._id,
    mentions,
    attachments,
    edited: {
      isEdited: false,
    },
    createdAt: new Date(),
  });

  // Record comment activity
  card.activity.push({
    action: 'commented',
    userId: req.user._id,
    data: {
      commentId: card.comments[card.comments.length - 1]._id,
    },
  });

  await card.save();

  res.status(200).json({
    status: 'success',
    data: {
      card,
    },
  });
});

// Update comment
exports.updateComment = catchAsync(async (req, res, next) => {
  const { cardId, commentId } = req.params;
  const { text, mentions = [] } = req.body;

  if (!text) {
    return next(new AppError('Comment text is required', 400));
  }

  const card = await Card.findById(cardId);
  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  const comment = card.comments.id(commentId);
  if (!comment) {
    return next(new AppError('Comment not found', 404));
  }

  // Check if user is the comment author
  if (comment.author.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only edit your own comments', 403));
  }

  // Update comment
  comment.text = text;
  comment.mentions = mentions;
  comment.edited = {
    isEdited: true,
    editedAt: new Date(),
  };

  // Add to activity log
  card.activity.push({
    action: 'updated',
    userId: req.user._id,
    data: {
      type: 'comment_edited',
      commentId: comment._id,
    },
  });

  await card.save();

  // Fetch updated card with populated fields
  const populatedCard = await Card.findById(cardId)
    .populate('comments.author', 'email firstName lastName')
    .populate('comments.mentions', 'email firstName lastName');

  const updatedComment = populatedCard.comments.id(commentId);

  res.status(200).json({
    status: 'success',
    data: {
      comment: updatedComment,
    },
  });
});

// Delete comment
exports.deleteComment = catchAsync(async (req, res, next) => {
  const { cardId, commentId } = req.params;

  const card = await Card.findById(cardId);
  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  const comment = card.comments.id(commentId);
  if (!comment) {
    return next(new AppError('Comment not found', 404));
  }

  // Check if user is the comment author or board admin
  const board = await Board.findById(card.boardId);
  const member = board.members.find(
    (m) => m.user.toString() === req.user._id.toString()
  );
  const isAdmin = member && ['admin', 'owner'].includes(member.role);

  if (comment.author.toString() !== req.user._id.toString() && !isAdmin) {
    return next(new AppError('You can only delete your own comments', 403));
  }

  comment.deleteOne({ _id: commentId });

  // Add to activity log
  card.activity.push({
    action: 'updated',
    userId: req.user._id,
    data: {
      type: 'comment_deleted',
    },
  });

  await card.save();

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Add reply to comment
exports.replyToComment = catchAsync(async (req, res, next) => {
  const { cardId, commentId } = req.params;
  const { text, mentions = [] } = req.body;

  const card = await Card.findById(cardId);
  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  const parentComment = card.comments.id(commentId);
  if (!parentComment) {
    return next(new AppError('Parent comment not found', 404));
  }

  const reply = {
    text,
    author: req.user._id,
    parentId: commentId,
    mentions,
    edited: {
      isEdited: false,
    },
    createdAt: new Date(),
  };

  card.comments.push(reply);

  // Add to activity log
  card.activity.push({
    action: 'commented',
    userId: req.user._id,
    data: {
      type: 'comment_reply',
      parentCommentId: commentId,
    },
  });

  await card.save();

  // Fetch updated card with populated fields
  const populatedCard = await Card.findById(cardId)
    .populate('comments.author', 'email firstName lastName')
    .populate('comments.mentions', 'email firstName lastName');

  const newReply = populatedCard.comments[populatedCard.comments.length - 1];

  res.status(201).json({
    status: 'success',
    data: {
      comment: newReply,
    },
  });
});

// Add reaction to comment
exports.addCommentReaction = catchAsync(async (req, res, next) => {
  const { cardId, commentId } = req.params;
  const { emoji } = req.body;

  if (!emoji) {
    return next(new AppError('Emoji is required', 400));
  }

  const card = await Card.findById(cardId);
  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  const comment = card.comments.id(commentId);
  if (!comment) {
    return next(new AppError('Comment not found', 404));
  }

  // Find existing reaction with same emoji
  let reaction = comment.reactions.find((r) => r.emoji === emoji);

  if (reaction) {
    // Toggle user's reaction
    const userIndex = reaction.users.indexOf(req.user._id);
    if (userIndex > -1) {
      reaction.users.splice(userIndex, 1);
      if (reaction.users.length === 0) {
        comment.reactions = comment.reactions.filter((r) => r.emoji !== emoji);
      }
    } else {
      reaction.users.push(req.user._id);
    }
  } else {
    // Add new reaction
    comment.reactions.push({
      emoji,
      users: [req.user._id],
    });
  }

  await card.save();

  // Fetch updated card with populated fields
  const populatedCard = await Card.findById(cardId)
    .populate('comments.author', 'email firstName lastName')
    .populate('comments.reactions.users', 'email firstName lastName');

  const updatedComment = populatedCard.comments.id(commentId);

  res.status(200).json({
    status: 'success',
    data: {
      comment: updatedComment,
    },
  });
});

// Get all comments with their replies
exports.getCommentThread = catchAsync(async (req, res, next) => {
  const { cardId } = req.params;

  const card = await Card.findById(cardId)
    .populate('comments.author', 'email firstName lastName')
    .populate('comments.mentions', 'email firstName lastName')
    .populate('comments.reactions.users', 'email firstName lastName')
    .select('comments');

  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  // Organize comments into a hierarchical structure
  const commentMap = new Map();
  const topLevelComments = [];

  // First pass: Create a map of all comments
  card.comments.forEach((comment) => {
    const commentObj = comment.toObject();
    commentObj.replies = [];
    commentMap.set(comment._id.toString(), commentObj);
  });

  // Second pass: Organize into hierarchy
  card.comments.forEach((comment) => {
    const commentId = comment._id.toString();
    const commentObj = commentMap.get(commentId);

    if (comment.parentId) {
      // This is a reply - add it to parent's replies
      const parentComment = commentMap.get(comment.parentId.toString());
      if (parentComment) {
        parentComment.replies.push(commentObj);
      }
    } else {
      // This is a top-level comment
      topLevelComments.push(commentObj);
    }
  });

  // Sort comments and replies by creation date
  const sortByDate = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);

  topLevelComments.sort(sortByDate);
  topLevelComments.forEach((comment) => {
    comment.replies.sort(sortByDate);
  });

  res.status(200).json({
    status: 'success',
    data: {
      comments: topLevelComments,
    },
  });
});

// Get card comments
exports.getCardComments = catchAsync(async (req, res, next) => {
  const { cardId } = req.params;

  const card = await Card.findById(cardId)
    .populate({
      path: 'comments',
      populate: [
        {
          path: 'author',
          select: 'email firstName lastName',
        },
        {
          path: 'mentions',
          select: 'email firstName lastName',
        },
      ],
    })
    .select('comments');

  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  // Organize comments into hierarchical structure
  const commentMap = new Map();
  const topLevelComments = [];

  // First pass: Create map of all comments
  card.comments.forEach((comment) => {
    const commentObj = comment.toObject();
    commentObj.replies = [];
    commentMap.set(comment._id.toString(), commentObj);
  });

  // Second pass: Organize into hierarchy
  card.comments.forEach((comment) => {
    const commentId = comment._id.toString();
    const commentObj = commentMap.get(commentId);

    if (comment.parentId) {
      // This is a reply - add it to parent's replies
      const parentComment = commentMap.get(comment.parentId.toString());
      if (parentComment) {
        parentComment.replies.push(commentObj);
      }
    } else {
      // This is a top-level comment
      topLevelComments.push(commentObj);
    }
  });

  // Sort comments and replies by creation date (newest first)
  const sortByDate = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);

  topLevelComments.sort(sortByDate);
  topLevelComments.forEach((comment) => {
    comment.replies.sort(sortByDate);
  });

  res.status(200).json({
    status: 'success',
    results: card.comments.length,
    data: {
      comments: topLevelComments,
    },
  });
});

// Update due date
exports.updateDueDate = catchAsync(async (req, res, next) => {
  let { date, reminder = false } = req.body;
  date = new Date(date);
  const card = await Card.findById(req.params.cardId);
  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  // Check board membership
  const board = await Board.findById(card.boardId);
  if (
    !board.members.some((m) => m.user.toString() === req.user._id.toString())
  ) {
    return next(
      new AppError('You must be a board member to update due date', 403)
    );
  }

  card.dueDate = {
    date: new Date(date),
    reminder,
    completed: false,
  };

  // Add activity
  card.activity.push({
    action: 'updated',
    userId: req.user._id,
    data: { field: 'dueDate', value: date },
  });

  await card.save();

  res.status(200).json({
    status: 'success',
    data: {
      card: formatCardResponse(card),
    },
  });
});

// Add a subtask
exports.addSubtask = catchAsync(async (req, res, next) => {
  const { title, dueDate, assignedTo } = req.body;
  const { cardId } = req.params;

  const card = await Card.findById(cardId);
  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  // Verify assigned user is a board member if provided
  if (assignedTo) {
    const board = await Board.findById(card.boardId);
    const isMember = board.members.some(
      (member) => member.user.toString() === assignedTo.toString()
    );
    if (!isMember) {
      return next(new AppError('Assigned user must be a board member', 400));
    }
  }

  const subtask = {
    title,
    dueDate: dueDate || null,
    assignedTo: assignedTo || null,
    position: card.subtasks.length,
    createdBy: req.user._id,
    createdAt: new Date(),
  };

  card.subtasks.push(subtask);

  // Add to activity log
  card.activity.push({
    action: 'updated',
    userId: req.user._id,
    data: {
      type: 'subtask_added',
      title,
    },
  });

  await card.save();

  // Fetch the updated card with populated fields
  const populatedCard = await Card.findById(cardId).populate({
    path: 'subtasks',
    populate: [
      { path: 'assignedTo', select: 'email firstName lastName' },
      { path: 'completedBy', select: 'email firstName lastName' },
      { path: 'createdBy', select: 'email firstName lastName' },
    ],
  });

  const newSubtask = populatedCard.subtasks[populatedCard.subtasks.length - 1];

  res.status(201).json({
    status: 'success',
    data: {
      subtask: newSubtask,
    },
  });
});

// Update subtask
exports.updateSubtask = catchAsync(async (req, res, next) => {
  const { cardId, subtaskId } = req.params;
  const updates = req.body;

  const card = await Card.findById(cardId).populate('boardId');

  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  const subtask = card.subtasks.id(subtaskId);
  if (!subtask) {
    return next(new AppError('Subtask not found', 404));
  }

  // Check if assigned user is being updated and is a board member
  if (updates.assignedTo) {
    const isAssignedUserMember = card.boardId.members.some(
      (member) => member.user.toString() === updates.assignedTo.toString()
    );
    if (!isAssignedUserMember) {
      return next(
        new AppError('Can only assign subtasks to board members', 400)
      );
    }
  }

  // Update allowed fields
  if (updates.title) subtask.title = updates.title;
  if ('dueDate' in updates) subtask.dueDate = updates.dueDate;
  if ('assignedTo' in updates) subtask.assignedTo = updates.assignedTo;

  await card.save();

  const populatedCard = await Card.findById(cardId)
    .populate('subtasks.assignedTo', 'email firstName lastName')
    .populate('subtasks.completedBy', 'email firstName lastName')
    .populate('subtasks.createdBy', 'email firstName lastName');

  const updatedSubtask = populatedCard.subtasks.id(subtaskId);

  res.status(200).json({
    status: 'success',
    data: {
      subtask: updatedSubtask,
    },
  });
});

// Toggle subtask completion
exports.toggleSubtask = catchAsync(async (req, res, next) => {
  const { cardId, subtaskId } = req.params;

  const card = await Card.findById(cardId);
  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  const subtask = card.subtasks.id(subtaskId);
  if (!subtask) {
    return next(new AppError('Subtask not found', 404));
  }

  // Toggle completion status
  subtask.isCompleted = !subtask.isCompleted;
  if (subtask.isCompleted) {
    subtask.completedAt = new Date();
    subtask.completedBy = req.user._id;
  } else {
    subtask.completedAt = undefined;
    subtask.completedBy = undefined;
  }

  await card.save();

  const populatedCard = await Card.findById(cardId)
    .populate('subtasks.assignedTo', 'email firstName lastName')
    .populate('subtasks.completedBy', 'email firstName lastName')
    .populate('subtasks.createdBy', 'email firstName lastName');

  const updatedSubtask = populatedCard.subtasks.id(subtaskId);

  res.status(200).json({
    status: 'success',
    data: {
      subtask: updatedSubtask,
    },
  });
});

// Delete subtask
exports.deleteSubtask = catchAsync(async (req, res, next) => {
  const { cardId, subtaskId } = req.params;

  const card = await Card.findById(cardId);
  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  const subtask = card.subtasks.id(subtaskId);
  if (!subtask) {
    return next(new AppError('Subtask not found', 404));
  }

  subtask.deleteOne({ _id: subtaskId });

  // Reorder remaining subtasks
  card.subtasks.forEach((task, index) => {
    task.position = index;
  });

  await card.save();

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Get all subtasks for a card
exports.getCardSubtasks = catchAsync(async (req, res, next) => {
  const { cardId } = req.params;

  const card = await Card.findById(cardId)
    .populate({
      path: 'subtasks',
      populate: [
        { path: 'assignedTo', select: 'email firstName lastName' },
        { path: 'completedBy', select: 'email firstName lastName' },
        { path: 'createdBy', select: 'email firstName lastName' },
      ],
    })
    .select('subtasks'); // Only select the subtasks field for efficiency

  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  // Sort subtasks by position
  const sortedSubtasks = card.subtasks.sort((a, b) => a.position - b.position);

  // Add completion statistics
  const stats = {
    total: sortedSubtasks.length,
    completed: sortedSubtasks.filter((task) => task.isCompleted).length,
    incomplete: sortedSubtasks.filter((task) => !task.isCompleted).length,
    completionPercentage:
      sortedSubtasks.length > 0
        ? Math.round(
            (sortedSubtasks.filter((task) => task.isCompleted).length /
              sortedSubtasks.length) *
              100
          )
        : 0,
  };

  res.status(200).json({
    status: 'success',
    data: {
      subtasks: sortedSubtasks,
      stats,
    },
  });
});

// Get all cards in a list
exports.getListCards = catchAsync(async (req, res, next) => {
  const { listId } = req.params;

  // Verify list exists
  const list = await List.findById(listId);
  if (!list) {
    return next(new AppError('List not found', 404));
  }

  // Verify board membership
  const board = await Board.findById(list.board);
  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  const isMember = board.members.some(
    (member) => member.user.toString() === req.user._id.toString()
  );
  if (!isMember) {
    return next(new AppError('You must be a board member to view cards', 403));
  }

  // Get all cards in the list
  const cards = await Card.find({ listId })
    .sort('position')
    .populate('members.user', 'email firstName lastName')
    .populate('createdBy', 'email firstName lastName')
    .populate('subtasks.assignedTo', 'email firstName lastName');

  res.status(200).json({
    status: 'success',
    results: cards.length,
    data: {
      cards: cards.map((card) => formatCardResponse(card)),
    },
  });
});

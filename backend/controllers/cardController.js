const Card = require('../models/cardModel');
const catchAsync = require('../utils/catchAsync');
const Board = require('../models/boardModel');
const List = require('../models/listModel');
const AppError = require('../utils/appError');

// Helper function to validate list and board access
const validateListAccess = async (listId, userId) => {
  // Verify list exists
  const list = await List.findById(listId);
  if (!list) {
    throw new AppError('List not found', 404);
  }

  // Verify board exists
  const board = await Board.findById(list.board);
  if (!board) {
    throw new AppError('Board not found', 404);
  }

  // Verify user is a board member
  const isMember = board.members.some(
    (member) => member.user.toString() === userId.toString()
  );
  if (!isMember) {
    throw new AppError(
      'You must be a board member to perform this action',
      403
    );
  }

  return { list, board };
};

// Helper function to check list card limit
const checkListCardLimit = async (listId) => {
  const list = await List.findById(listId).populate('cards');

  // Check if list has a card limit and if the limit has been reached
  if (list.cardLimit && list.cards.length >= list.cardLimit) {
    throw new AppError('List card limit reached', 400);
  }
};

// Helper function to manage card positions
const manageCardPosition = async (listId, position = null) => {
  const lastCard = await Card.findOne({
    list: listId,
  }).sort('-position');

  return position !== null ? position : lastCard ? lastCard.position + 1 : 0;
};

// Helper function to log card activity
const logCardActivity = (card, action, userId, data = {}) => {
  card.activity.push({
    action,
    userId,
    data,
    timestamp: new Date(),
  });
};

// Helper function to manage positions when moving/copying cards
const recalculatePositions = async (
  listId,
  startPosition,
  increment = true
) => {
  // Update positions of cards after the insertion/removal point
  await Card.updateMany(
    {
      list: listId,
      position: { [increment ? '$gte' : '$gt']: startPosition },
    },
    { $inc: { position: increment ? 1 : -1 } }
  );
};

// Create Card
exports.createCard = catchAsync(async (req, res, next) => {
  const listId = req.body.list;

  // Validate access and check limits
  await validateListAccess(listId, req.user._id);
  await checkListCardLimit(listId);

  // Get position
  const cardPosition = await manageCardPosition(listId);

  // Create card
  const card = await Card.create({
    ...req.body,
    list: listId,
    position: cardPosition,
    createdBy: req.user._id,
    members: [
      {
        user: req.user._id,
        assignedBy: req.user._id,
        assignedAt: new Date(),
      },
    ],
  });

  // Log activity
  logCardActivity(card, 'created', req.user._id, { title: card.title });
  await card.save();

  res.status(201).json({
    status: 'success',
    data: {
      card,
    },
  });
});

// Get Single Card
exports.getCard = catchAsync(async (req, res, next) => {
  const card = await Card.findById(req.params.cardId);

  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  // Validate access
  await validateListAccess(card.list._id, req.user._id);

  res.status(200).json({
    status: 'success',
    data: {
      card,
    },
  });
});

// Update Card
exports.updateCard = catchAsync(async (req, res, next) => {
  const { cardId } = req.params;
  const updateData = { ...req.body };

  // Find card first to validate access
  const card = await Card.findById(cardId);
  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  // Validate access
  await validateListAccess(card.list, req.user._id);

  // Prevent modification of critical fields
  delete updateData.createdBy;
  delete updateData.list;
  delete updateData.position;

  // Track what's being updated
  const changes = {};
  Object.keys(updateData).forEach((key) => {
    changes[key] = {
      from: card[key],
      to: updateData[key],
    };
  });

  // Log activity
  logCardActivity(card, 'updated', req.user._id, {
    changes,
    updatedFields: Object.keys(updateData),
  });

  // Update card with everything including the new activity
  const updatedCard = await Card.findByIdAndUpdate(
    cardId,
    {
      ...updateData,
      activity: card.activity, // Include our newly logged activity
    },
    {
      new: true,
      runValidators: true,
    }
  );
  await updatedCard.save();

  res.status(200).json({
    status: 'success',
    data: { card: updatedCard },
  });
});

// Delete card
exports.deleteCard = catchAsync(async (req, res, next) => {
  const { cardId } = req.params;

  const card = await Card.findById(cardId);
  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  // Validate access with admin check
  await validateListAccess(card.list, req.user._id);

  await card.deleteOne();

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Toggle card completion status
exports.toggleCard = catchAsync(async (req, res, next) => {
  const { cardId } = req.params;

  const card = await Card.findById(cardId);
  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  // Validate access
  await validateListAccess(card.list, req.user._id);

  const currentState = card.state.current;
  const now = new Date();

  // Toggle completion status
  if (currentState === 'completed') {
    // Check for overdue status when uncompleting
    if (card.dueDate?.endDate && new Date(card.dueDate.endDate) < now) {
      card.state.current = 'overdue';
      card.state.overdueAt = now;
    } else {
      card.state.current = 'active';
    }
    // Clear completion data
    card.state.completedAt = undefined;
    card.state.completedBy = undefined;
  } else {
    card.state.current = 'completed';
    card.state.completedAt = now;
    card.state.completedBy = req.user._id;
    card.state.overdueAt = undefined;
  }

  // Update lastStateChange
  card.state.lastStateChange = now;

  // Log the state change activity
  logCardActivity(card, 'status_changed', req.user._id, {
    from: currentState,
    to: card.state.current,
    ...(card.state.current === 'completed' && { completedBy: req.user._id }),
    timestamp: now,
  });

  await card.save();

  // Return updated card with populated fields
  const updatedCard = await Card.findById(cardId);

  res.status(200).json({
    status: 'success',
    data: {
      card: updatedCard,
    },
  });
});

// Move card
exports.moveCard = catchAsync(async (req, res, next) => {
  const { cardId } = req.params;
  const { listId, position } = req.body;

  // Validate provided data
  if (!listId || position === undefined) {
    return next(new AppError('List ID and position are required', 400));
  }

  // Get card and validate its existence
  const card = await Card.findById(cardId);
  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  // Validate source and destination list access
  await validateListAccess(card.list, req.user._id);
  await validateListAccess(listId, req.user._id);

  // Check destination list card limit
  await checkListCardLimit(listId);

  // Store old values for activity log
  const oldList = card.list;
  const oldPosition = card.position;

  // If moving to a different list
  if (oldList.toString() !== listId) {
    // Decrease positions in old list
    await recalculatePositions(oldList, oldPosition, false);
  }

  // Increase positions in new list
  await recalculatePositions(listId, position, true);

  // Update card
  card.list = listId;
  card.position = position;

  // Log activity
  logCardActivity(card, 'moved', req.user._id, {
    from: {
      list: oldList,
      position: oldPosition,
    },
    to: {
      list: listId,
      position,
    },
  });

  await card.save();

  // Get updated card with populated fields
  const updatedCard = await Card.findById(cardId);

  res.status(200).json({
    status: 'success',
    data: {
      card: updatedCard,
    },
  });
});

// Update due date
exports.updateDueDate = catchAsync(async (req, res, next) => {
  const { cardId } = req.params;
  const { startDate, endDate } = req.body;

  const card = await Card.findById(cardId);
  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  // Validate access
  await validateListAccess(card.list, req.user._id);

  const dueDate = card.dueDate;
  if (!dueDate) {
    return next(new AppError('Card does not have a due date', 400));
  }

  // Store old values for activity log
  const oldDueDate = {
    startDate: dueDate.startDate,
    endDate: dueDate.endDate,
  };

  // Update dueDate
  if (startDate) dueDate.startDate = startDate;
  if (endDate) dueDate.endDate = endDate;

  // Log activity
  logCardActivity(card, 'date_updated', req.user._id, {
    dueDate: {
      from: oldDueDate,
      to: { startDate: dueDate.startDate, endDate: dueDate.endDate },
    },
  });
  await card.save();

  res.status(200).json({
    status: 'success',
    data: { card },
  });
});

// Add label to card
exports.addLabel = catchAsync(async (req, res, next) => {
  const { cardId } = req.params;
  const { name, color } = req.body;

  if (!name || !color) {
    return next(new AppError('Label name and color are required', 400));
  }

  const card = await Card.findById(cardId);
  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  // Validate access
  await validateListAccess(card.list, req.user._id);

  // Add new label
  card.labels.push({
    name,
    color,
    createdBy: req.user._id,
  });

  // Log activity
  logCardActivity(card, 'label_added', req.user._id, {
    label: { name, color },
  });

  await card.save();

  res.status(200).json({
    status: 'success',
    data: { card },
  });
});

exports.updateLabel = catchAsync(async (req, res, next) => {
  const { cardId, labelId } = req.params;
  const { name, color } = req.body;

  const card = await Card.findById(cardId);
  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  // Validate access
  await validateListAccess(card.list, req.user._id);

  // Find the label
  const label = card.labels.id(labelId);
  if (!label) {
    return next(new AppError('Label not found', 404));
  }

  // Store old values for activity log
  const oldLabel = {
    name: label.name,
    color: label.color,
  };

  // Update label
  if (name) label.name = name;
  if (color) label.color = color;

  // Log activity
  logCardActivity(card, 'label_updated', req.user._id, {
    label: {
      from: oldLabel,
      to: { name: label.name, color: label.color },
    },
  });
  await card.save();

  res.status(200).json({
    status: 'success',
    data: { card },
  });
});

// Remove label from card
exports.removeLabel = catchAsync(async (req, res, next) => {
  const { cardId, labelId } = req.params;

  const card = await Card.findById(cardId);
  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  // Validate access
  await validateListAccess(card.list, req.user._id);

  const labelIndex = card.labels.findIndex(
    (label) => label._id.toString() === labelId
  );

  if (labelIndex === -1) {
    return next(new AppError('Label not found', 404));
  }

  const removedLabel = card.labels[labelIndex];
  card.labels.splice(labelIndex, 1);

  // Log activity
  logCardActivity(card, 'label_removed', req.user._id, {
    label: {
      name: removedLabel.name,
      color: removedLabel.color,
    },
  });

  await card.save();

  res.status(200).json({
    status: 'success',
    data: { card },
  });
});

// Add member to card
exports.addMember = catchAsync(async (req, res, next) => {
  const { cardId } = req.params;
  const { userId } = req.body;

  const card = await Card.findById(cardId);
  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  // Validate access and get board info
  const { board } = await validateListAccess(card.list, req.user._id);

  // Check if user is a board member
  const isBoardMember = board.members.some(
    (member) => member.user.toString() === userId.toString()
  );
  if (!isBoardMember) {
    return next(new AppError('User must be a board member first', 400));
  }

  // Check if user is already a card member
  const isCardMember = card.members.some(
    (member) => member.user.toString() === userId.toString()
  );
  if (isCardMember) {
    return next(new AppError('User is already a card member', 400));
  }

  card.members.push({
    user: userId,
    assignedBy: req.user._id,
    assignedAt: new Date(),
  });

  // Log activity
  logCardActivity(card, 'member_added', req.user._id, {
    memberId: userId,
    assignedBy: req.user._id,
  });

  await card.save();

  // Get updated card with populated fields
  const updatedCard = await Card.findById(cardId)
    .populate('members.user', 'email firstName lastName avatar username')
    .populate('members.assignedBy', 'email firstName lastName');

  const members = updatedCard.members.map((member) => ({
    id: member.user._id,
    user: member.user,
    assignedBy: member.assignedBy,
    assignedAt: member.assignedAt,
  }));

  res.status(200).json({
    status: 'success',
    data: {
      members,
      total: members.length,
    },
  });
});

// Remove member from card
exports.removeMember = catchAsync(async (req, res, next) => {
  const { cardId, userId } = req.params;

  const card = await Card.findById(cardId);
  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  // Validate access
  await validateListAccess(card.list, req.user._id);

  // Check if user exists in card members
  const memberIndex = card.members.findIndex(
    (member) => member.user.toString() === userId.toString()
  );

  if (memberIndex === -1) {
    return next(new AppError('User is not a card member', 404));
  }

  // Store removed member for activity log
  const removedMember = card.members[memberIndex];

  // Remove member
  card.members.splice(memberIndex, 1);

  // Log activity
  logCardActivity(card, 'member_removed', req.user._id, {
    memberId: userId,
    removedBy: req.user._id,
    previouslyAssignedBy: removedMember.assignedBy,
  });

  await card.save();

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Get card members
exports.getCardMembers = catchAsync(async (req, res, next) => {
  const { cardId } = req.params;

  const card = await Card.findById(cardId);
  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  // Validate access
  await validateListAccess(card.list, req.user._id);

  // Get populated members
  const populatedCard = await Card.findById(cardId)
    .populate('members.user', 'email firstName lastName avatar username')
    .populate('members.assignedBy', 'email firstName lastName')
    .select('members');

  const members = populatedCard.members.map((member) => ({
    id: member.user._id,
    user: member.user,
    assignedBy: member.assignedBy,
    assignedAt: member.assignedAt,
  }));

  res.status(200).json({
    status: 'success',
    data: {
      members,
      total: members.length,
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

  const list = await List.findById(card.list);
  if (!list) {
    throw new AppError('List not found', 404);
  }

  const board = await Board.findById(list.board);
  if (!board) {
    throw new AppError('Board not found', 404);
  }

  // Verify assigned user is a board member if provided
  if (assignedTo) {
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

  // Log activity
  logCardActivity(card, 'subtask_added', req.user._id, {
    subtask: {
      title,
    },
  });
  await card.save();

  // Fetch the updated card with populated fields
  const populatedCard = await Card.findById(cardId).populate({
    path: 'subtasks',
    populate: [
      { path: 'assignedTo', select: 'avatar email firstName lastName' },
      { path: 'completedBy', select: 'avatar email firstName lastName' },
      { path: 'createdBy', select: 'avatar email firstName lastName' },
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

  const card = await Card.findById(cardId);

  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  const list = await List.findById(card.list);
  if (!list) {
    throw new AppError('List not found', 404);
  }

  const board = await Board.findById(list.board);
  if (!board) {
    throw new AppError('Board not found', 404);
  }

  const subtask = card.subtasks.id(subtaskId);
  if (!subtask) {
    return next(new AppError('Subtask not found', 404));
  }

  // Check if assigned user is being updated and is a board member
  if (updates.assignedTo) {
    const isAssignedUserMember = board.members.some(
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

  // Check if all subtasks are completed or not
  const allSubtasksCompleted = card.subtasks.every((task) => task.isCompleted);

  // Update card state based on subtasks completion
  if (!allSubtasksCompleted && card.state.current === 'completed') {
    // If any subtask is incomplete, clear card completion
    card.state.current = 'active';
    card.state.completedAt = undefined;
    card.state.completedBy = undefined;
    card.state.lastStateChange = new Date();
  } else if (allSubtasksCompleted && card.state.current === 'active') {
    // If all subtasks are completed, mark card as completed
    card.state.current = 'completed';
    card.state.completedAt = new Date();
    card.state.completedBy = req.user._id;
    card.state.lastStateChange = new Date();
  }

  await card.save();

  const populatedCard = await Card.findById(cardId);

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
  const listId = req.params.list;

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
  const cards = await Card.find({ list })
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

const Card = require('../models/cardModel');
const Attachment = require('../models/attachmentModel');
const catchAsync = require('../utils/catchAsync');
const Board = require('../models/boardModel');
const List = require('../models/listModel');
const AppError = require('../utils/appError');
const permissionService = require('../utils/permissionService');
const activityService = require('../utils/activityService');
const notificationService = require('../utils/notificationService');

// Helper function to safely get io instance
const getIO = (req) => {
  if (req && req.app && req.app.io) return req.app.io;
  if (global.io) return global.io;
  return null;
};

// Helper function to validate card access and get related objects
const getCardWithContext = async (cardId, userId) => {
  // Find card and verify it exists
  const card = await Card.findById(cardId);
  if (!card) {
    throw new AppError('Card not found', 404);
  }

  // Find list and verify it exists
  const list = await List.findById(card.list);
  if (!list) {
    throw new AppError('List not found', 404);
  }

  // Find board and verify it exists
  const board = await Board.findById(list.board);
  if (!board) {
    throw new AppError('Board not found', 404);
  }

  // Verify user is a board member
  const isMember = board.members.some(
    (member) => member.user.toString() === userId.toString()
  );
  if (!isMember) {
    throw new AppError('You must be a board member to access this card', 403);
  }

  return { card, list, board };
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

// Helper function to manage positions when moving cards
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
  const priority = req.body.priority;

  // Find the list and its parent board
  const list = await List.findById(listId);
  if (!list) {
    return next(new AppError('List not found', 404));
  }

  const board = await Board.findById(list.board);
  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  // Check permissions
  permissionService.verifyPermission(board, req.user._id, 'create_cards');

  // Validate priority if provided
  if (priority) {
    const validPriorityLevels = ['none', 'low', 'medium', 'high'];
    if (!validPriorityLevels.includes(priority)) {
      return next(
        new AppError(
          `Invalid priority level. Must be one of: ${validPriorityLevels.join(
            ', '
          )}`,
          400
        )
      );
    }
  }

  // Check list card limit
  await checkListCardLimit(listId);

  // Get position
  const cardPosition = await manageCardPosition(listId);

  // Process subtasks if they exist in the request body
  if (req.body.subtasks && Array.isArray(req.body.subtasks)) {
    // Add createdBy to each subtask
    req.body.subtasks = req.body.subtasks.map((subtask, index) => ({
      ...subtask,
      createdBy: req.user._id,
      position: index,
    }));
  }

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

  // Process uploaded files
  let uploadedFiles = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      // Store originalName in a Buffer to preserve UTF-8 encoding
      const originalNameBuffer = Buffer.from(file.originalname, 'binary');
      const originalName = originalNameBuffer.toString('utf8');

      const newFile = await Attachment.create({
        originalName: originalName,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        path: path.join('uploads', 'attachments', req.file.filename),
        entityType: 'card',
        entityId: card._id,
        uploadedBy: req.user._id,
      });

      uploadedFiles.push(newFile);

      // Add file activity log
      await activityService.logCardActivity(
        board,
        req.user._id,
        'attachment_added',
        card._id,
        {
          fileId: newFile._id,
          filename: newFile.originalName,
          size: newFile.formatSize
            ? newFile.formatSize()
            : `${Math.round(newFile.size / 1024)} KB`,
        }
      );
    }
  }

  // Log activity in board
  await activityService.logCardActivity(
    board,
    req.user._id,
    'card_created',
    card._id,
    {
      title: card.title,
      listId: listId,
      priority: priority || 'none',
    }
  );

  // Get board members to notify about the new card
  const boardMembers = board.members
    .filter((member) => member.user.toString() !== req.user._id.toString())
    .map((member) => member.user);

  // Notify all board members except the card creator
  for (const memberId of boardMembers) {
    await notificationService.createNotification(
      req.app.io,
      memberId,
      req.user._id,
      'card_created',
      'card',
      card._id,
      {
        cardTitle: card.title,
        listName: list.name,
        boardName: board.name,
        boardId: board._id,
      }
    );
  }
  res.status(201).json({
    status: 'success',
    data: {
      card,
    },
  });
});

// Get Single Card (with attachments)
exports.getCard = catchAsync(async (req, res, next) => {
  const { card, board } = await getCardWithContext(
    req.params.cardId,
    req.user._id
  );

  // Check permission
  permissionService.verifyPermission(board, req.user._id, 'view_board');

  // Get card attachments
  const attachments = await Attachment.find({
    entityType: 'card',
    entityId: card._id,
  }).populate('uploadedBy', 'firstName lastName email avatar username');

  res.status(200).json({
    status: 'success',
    data: {
      card,
      attachments,
    },
  });
});

// Update Card with Files
exports.updateCard = catchAsync(async (req, res, next) => {
  const { cardId } = req.params;
  const updateData = { ...req.body };

  // Get card with context and verify access
  const { card, board } = await getCardWithContext(cardId, req.user._id);

  // Verify permission to edit this card
  permissionService.verifyCardEdit(board, card, req.user._id);

  // Prevent modification of critical fields
  delete updateData.createdBy;
  delete updateData.list;
  delete updateData.position;

  // Validate priority if it's being updated
  if (updateData.priority) {
    const validPriorityLevels = ['none', 'low', 'medium', 'high'];
    if (!validPriorityLevels.includes(updateData.priority)) {
      return next(
        new AppError(
          `Invalid priority level. Must be one of: ${validPriorityLevels.join(
            ', '
          )}`,
          400
        )
      );
    }
  }

  // Process subtasks if they exist in the update data
  if (updateData.subtasks && Array.isArray(updateData.subtasks)) {
    // Add createdBy to each subtask that doesn't have it
    updateData.subtasks = updateData.subtasks.map((subtask, index) => {
      if (!subtask.createdBy) {
        return {
          ...subtask,
          createdBy: req.user._id,
          position: index,
        };
      }
      return subtask;
    });
  }

  // Check if there are card fields to update
  let updatedCard = card;
  if (Object.keys(updateData).length > 0) {
    // Track what's being updated
    const changes = {};
    Object.keys(updateData).forEach((key) => {
      changes[key] = {
        from: card[key],
        to: updateData[key],
      };
    });

    // Log activity for card data updates
    await activityService.logCardActivity(
      board,
      req.user._id,
      'card_updated',
      cardId,
      {
        changes,
        updatedFields: Object.keys(updateData),
      }
    );

    // Update card
    updatedCard = await Card.findByIdAndUpdate(cardId, updateData, {
      new: true,
      runValidators: true,
    });
    // Get all board members to notify - using the pattern that works
    const boardMembers = board.members.filter(
      (member) => member.user.toString() !== req.user._id.toString()
    );

    // Send notifications to board members
    for (const member of boardMembers) {
      await notificationService.createNotification(
        req.app.io,
        member.user,
        req.user._id,
        'card_updated',
        'card',
        card._id,
        {
          cardTitle: card.title,
          boardId: board._id,
          boardName: board.name,
          updatedFields: Object.keys(updateData),
        }
      );
    }
  }

  // Process uploaded files
  let uploadedFiles = [];
  if (req.files && req.files.length > 0) {
    console.log(
      `Processing ${req.files.length} uploaded files for card ${cardId}`
    );

    for (const file of req.files) {
      console.log(`Creating attachment record for file: ${file.originalname}`);
      // Store originalName in a Buffer to preserve UTF-8 encoding
      const originalNameBuffer = Buffer.from(file.originalname, 'binary');
      const originalName = originalNameBuffer.toString('utf8');

      const newFile = await Attachment.create({
        originalName: originalName,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        entityType: 'card',
        entityId: cardId,
        uploadedBy: req.user._id,
      });

      uploadedFiles.push(newFile);

      // Add file activity log
      await activityService.logCardActivity(
        board,
        req.user._id,
        'attachment_added',
        cardId,
        {
          fileId: newFile._id,
          filename: newFile.originalName,
          size: newFile.formatSize
            ? newFile.formatSize()
            : `${Math.round(newFile.size / 1024)} KB`,
        }
      );
      // Get all board members to notify - using the pattern that works
      const boardMembers = board.members.filter(
        (member) => member.user.toString() !== req.user._id.toString()
      );

      // Send attachment notifications to board members
      for (const member of boardMembers) {
        await notificationService.createNotification(
          req.app.io,
          member.user,
          req.user._id,
          'attachment_added',
          'attachment',
          newFile._id,
          {
            entityType: 'card',
            entityName: card.title,
            cardId: card._id,
            boardId: board._id,
            boardName: board.name,
            filename: newFile.originalName,
            fileSize: newFile.formatSize
              ? newFile.formatSize()
              : `${Math.round(newFile.size / 1024)} KB`,
          }
        );
      }
    }

    console.log(`Successfully processed ${uploadedFiles.length} files`);
  }

  // Get updated card with populated fields if needed
  const populatedCard = await Card.findById(cardId)
    .populate('members.user', 'firstName lastName email avatar username')
    .populate('createdBy', 'firstName lastName email avatar username');

  res.status(200).json({
    status: 'success',
    data: {
      card: populatedCard,
      files: uploadedFiles,
    },
  });
});
// Delete card
exports.deleteCard = catchAsync(async (req, res, next) => {
  const { cardId } = req.params;

  // Get card with context and verify access
  const { card, board } = await getCardWithContext(cardId, req.user._id);

  // Verify delete permission
  if (card.createdBy.toString() === req.user._id.toString()) {
    // Creator can delete their own card if they have edit_own_cards permission
    permissionService.verifyPermission(board, req.user._id, 'edit_own_cards');
  } else {
    // Otherwise need delete_cards permission
    permissionService.verifyPermission(board, req.user._id, 'delete_cards');
  }

  // Store card info for notifications
  const cardInfo = {
    title: card.title,
    listId: card.list,
  };

  // Log activity before deletion
  await activityService.logCardActivity(
    board,
    req.user._id,
    'card_deleted',
    card._id,
    {
      title: card.title,
      listId: card.list,
    }
  );

  // Get all board members to notify - this is the key change
  // This follows the pattern from your working board notifications
  const boardMembers = board.members.filter(
    (member) => member.user.toString() !== req.user._id.toString()
  );

  console.log(`Found ${boardMembers.length} board members to notify`);

  await card.deleteOne();

  // Send notifications to all board members
  for (const member of boardMembers) {
    await notificationService.createNotification(
      req.app.io,
      member.user,
      req.user._id,
      'card_deleted',
      'board', // Using board as entity since card is deleted
      board._id,
      {
        cardTitle: cardInfo.title,
        boardId: board._id,
        boardName: board.name,
      }
    );
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Toggle card completion status
exports.toggleCard = catchAsync(async (req, res, next) => {
  const { cardId } = req.params;

  // Get card with context and verify access
  const { card, board } = await getCardWithContext(cardId, req.user._id);

  const currentState = card.state.current;
  const targetState = currentState === 'completed' ? 'active' : 'completed';

  // Verify completion permission - only assigned members, admins, and owners can complete cards
  permissionService.verifyCardCompletion(
    board,
    card,
    req.user._id,
    targetState
  );

  // Validate access
  // await validateListAccess(card.list, req.user._id);

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
  await card.save();

  // Log activity
  await activityService.logCardActivity(
    board,
    req.user._id,
    'card_status_changed',
    card._id,
    {
      from: currentState,
      to: card.state.current,
      ...(card.state.current === 'completed' && { completedBy: req.user._id }),
      timestamp: now,
    }
  );

  // Get all board members to notify
  const boardMembers = board.members.filter(
    (member) => member.user.toString() !== req.user._id.toString()
  );

  // Send notifications
  for (const member of boardMembers) {
    await notificationService.createNotification(
      req.app.io,
      member.user,
      req.user._id,
      'card_status_changed',
      'card',
      card._id,
      {
        cardTitle: card.title,
        boardId: board._id,
        boardName: board.name,
        newStatus: card.state.current,
        from: currentState,
      }
    );
  }
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

  // Get card with context and verify access
  const { card, board } = await getCardWithContext(cardId, req.user._id);

  // Verify permission to move this card
  permissionService.verifyCardMove(board, card, req.user._id);

  // Check destination list exists
  const destList = await List.findById(listId);
  if (!destList) {
    return next(new AppError('Destination list not found', 404));
  }

  // Check if destination list is on the same board
  if (destList.board.toString() !== board._id.toString()) {
    return next(
      new AppError('Cannot move card to a list on a different board', 400)
    );
  }

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

  await card.save();

  // Get the source and destination lists
  const sourceList = await List.findById(oldList);
  const destListName = destList ? destList.name : 'Unknown List';
  const sourceListName = sourceList ? sourceList.name : 'Unknown List';

  // Log activity
  await activityService.logCardActivity(
    board,
    req.user._id,
    'card_moved',
    card._id,
    {
      from: {
        list: oldList,
        position: oldPosition,
      },
      to: {
        list: listId,
        position,
      },
    }
  );

  // Get all board members to notify - using the pattern that works
  const boardMembers = board.members.filter(
    (member) => member.user.toString() !== req.user._id.toString()
  );

  // Send notifications to board members
  for (const member of boardMembers) {
    await notificationService.createNotification(
      req.app.io,
      member.user,
      req.user._id,
      'card_moved',
      'card',
      card._id,
      {
        cardTitle: card.title,
        boardId: board._id,
        boardName: board.name,
        fromList: sourceListName,
        toList: destListName,
      }
    );
  }

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

  // Get card with context and verify access
  const { card, board } = await getCardWithContext(cardId, req.user._id);

  // Verify edit permission
  permissionService.verifyCardEdit(board, card, req.user._id);

  const dueDate = card.dueDate || {};
  // Store old values for activity log
  const oldDueDate = {
    startDate: dueDate.startDate,
    endDate: dueDate.endDate,
  };

  // Update dueDate
  if (startDate) dueDate.startDate = startDate;
  if (endDate) dueDate.endDate = endDate;

  card.dueDate = dueDate;
  await card.save();

  // Log activity
  await activityService.logCardActivity(
    board,
    req.user._id,
    'card_updated',
    card._id,
    {
      field: 'dueDate',
      from: oldDueDate,
      to: { startDate: dueDate.startDate, endDate: dueDate.endDate },
    }
  );

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

  // Get card with context and verify access
  const { card, board } = await getCardWithContext(cardId, req.user._id);

  // Verify permission to edit this card
  permissionService.verifyCardEdit(board, card, req.user._id);

  // Add new label
  card.labels.push({
    name,
    color,
    createdBy: req.user._id,
  });

  await card.save();

  // Log activity
  await activityService.logCardActivity(
    board,
    req.user._id,
    'label_added',
    card._id,
    {
      label: { name, color },
    }
  );

  res.status(200).json({
    status: 'success',
    data: { card },
  });
});

exports.updateLabel = catchAsync(async (req, res, next) => {
  const { cardId, labelId } = req.params;
  const { name, color } = req.body;

  // Get card with context and verify access
  const { card, board } = await getCardWithContext(cardId, req.user._id);

  // Verify permission to edit this card
  permissionService.verifyCardEdit(board, card, req.user._id);

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

  await card.save();

  // Log activity
  await activityService.logCardActivity(
    board,
    req.user._id,
    'label_updated',
    card._id,
    {
      label: {
        id: labelId,
        from: oldLabel,
        to: { name: label.name, color: label.color },
      },
    }
  );
  res.status(200).json({
    status: 'success',
    data: { card },
  });
});

// Remove label from card
exports.removeLabel = catchAsync(async (req, res, next) => {
  const { cardId, labelId } = req.params;

  // Get card with context and verify access
  const { card, board } = await getCardWithContext(cardId, req.user._id);

  // Verify permission to edit this card
  permissionService.verifyCardEdit(board, card, req.user._id);

  const labelIndex = card.labels.findIndex(
    (label) => label._id.toString() === labelId
  );

  if (labelIndex === -1) {
    return next(new AppError('Label not found', 404));
  }

  const removedLabel = card.labels[labelIndex];
  card.labels.splice(labelIndex, 1);

  await card.save();

  // Log activity
  await activityService.logCardActivity(
    board,
    req.user._id,
    'label_removed',
    card._id,
    {
      label: {
        id: labelId,
        name: removedLabel.name,
        color: removedLabel.color,
      },
    }
  );

  res.status(200).json({
    status: 'success',
    data: { card },
  });
});

// Add member to card
exports.addMember = catchAsync(async (req, res, next) => {
  const { cardId } = req.params;
  const { userId } = req.body;

  // Get card with context and verify access
  const { card, board } = await getCardWithContext(cardId, req.user._id);

  // Verify permission to assign members
  permissionService.verifyPermission(board, req.user._id, 'assign_members');

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
  await card.save();

  // After successfully adding the member, send a notification
  if (global.io && userId !== req.user._id.toString()) {
    await notificationService.createNotification(
      global.io,
      userId,
      req.user._id,
      'card_assignment',
      'card',
      card._id,
      {
        cardTitle: card.title,
        boardId: board._id,
        boardName: board.name,
        listId: card.list,
      }
    );
  }

  // Log activity
  await activityService.logCardActivity(
    board,
    req.user._id,
    'member_added',
    card._id,
    {
      memberId: userId,
      assignedBy: req.user._id,
    }
  );

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

  // Get card with context and verify access
  const { card, board } = await getCardWithContext(cardId, req.user._id);

  // Verify permission to assign members or check if removing self
  const isSelf = userId === req.user._id.toString();
  if (!isSelf) {
    permissionService.verifyPermission(board, req.user._id, 'assign_members');
  }

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
  await card.save();

  // Log activity
  await activityService.logCardActivity(
    board,
    req.user._id,
    'member_removed',
    card._id,
    {
      memberId: userId,
      removedBy: req.user._id,
      previouslyAssignedBy: removedMember.assignedBy,
    }
  );

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Get card members
exports.getCardMembers = catchAsync(async (req, res, next) => {
  const { cardId } = req.params;

  // Get card with context and verify access
  const { card, board } = await getCardWithContext(cardId, req.user._id);

  // Verify view permission
  permissionService.verifyPermission(board, req.user._id, 'view_board');

  // Get populated members
  const populatedCard = await Card.findById(cardId)
    .populate('members.user', 'email firstName lastName avatar username')
    .populate('members.assignedBy', 'email firstName lastName')
    .select('members');

  const members = populatedCard.members
    .filter((member) => member.user)
    .map((member) => ({
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

  // Get card with context and verify access
  const { card, board } = await getCardWithContext(cardId, req.user._id);

  // Verify edit permission for the card
  permissionService.verifyCardEdit(board, card, req.user._id);

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
  await activityService.logCardActivity(
    board,
    req.user._id,
    'subtask_added',
    card._id,
    {
      subtask: {
        title,
        assignedTo: assignedTo || null,
      },
    }
  );
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

  // Get card with context and verify access
  const { card, board } = await getCardWithContext(cardId, req.user._id);

  // Verify edit permission for the card
  permissionService.verifyCardEdit(board, card, req.user._id);

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

  // Track changes for activity log
  const changes = {};
  if (updates.title && updates.title !== subtask.title) {
    changes.title = { from: subtask.title, to: updates.title };
    subtask.title = updates.title;
  }

  if ('dueDate' in updates && updates.dueDate !== subtask.dueDate) {
    changes.dueDate = { from: subtask.dueDate, to: updates.dueDate };
    subtask.dueDate = updates.dueDate;
  }

  if ('assignedTo' in updates && updates.assignedTo !== subtask.assignedTo) {
    changes.assignedTo = { from: subtask.assignedTo, to: updates.assignedTo };
    subtask.assignedTo = updates.assignedTo;
  }

  // Log activity if there are changes
  if (Object.keys(changes).length > 0) {
    await activityService.logCardActivity(
      board,
      req.user._id,
      'card_updated',
      card._id,
      {
        subtask: {
          id: subtaskId,
          changes,
        },
      }
    );
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

// Toggle subtask completion
exports.toggleSubtask = catchAsync(async (req, res, next) => {
  const { cardId, subtaskId } = req.params;

  // Get card with context and verify access
  const { card, board } = await getCardWithContext(cardId, req.user._id);

  // Verify edit permission for the card
  permissionService.verifyCardEdit(board, card, req.user._id);

  const subtask = card.subtasks.id(subtaskId);
  if (!subtask) {
    return next(new AppError('Subtask not found', 404));
  }

  // Track original state for activity log
  const originalCompletionState = subtask.isCompleted;

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
    // If all subtasks are completed, check if user has permission to complete the card
    permissionService.verifyCardCompletion(
      board,
      card,
      req.user._id,
      'completed'
    );

    // Mark card as completed
    card.state.current = 'completed';
    card.state.completedAt = new Date();
    card.state.completedBy = req.user._id;
    card.state.lastStateChange = new Date();
  }

  // Log activity
  await activityService.logCardActivity(
    board,
    req.user._id,
    'card_updated',
    card._id,
    {
      subtask: {
        id: subtaskId,
        title: subtask.title,
        completionChanged: {
          from: originalCompletionState,
          to: subtask.isCompleted,
        },
      },
    }
  );
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

  // Get card with context and verify access
  const { card, board } = await getCardWithContext(cardId, req.user._id);

  // Verify edit permission
  permissionService.verifyCardEdit(board, card, req.user._id);

  const subtask = card.subtasks.id(subtaskId);
  if (!subtask) {
    return next(new AppError('Subtask not found', 404));
  }

  // Store subtask info for activity log
  const subtaskInfo = {
    id: subtaskId,
    title: subtask.title,
    position: subtask.position,
    isCompleted: subtask.isCompleted,
  };
  // Remove the subtask
  subtask.deleteOne({ _id: subtaskId });

  // Reorder remaining subtasks
  card.subtasks.forEach((task, index) => {
    task.position = index;
  });

  // Log activity
  await activityService.logCardActivity(
    board,
    req.user._id,
    'subtask_removed',
    card._id,
    {
      subtask: subtaskInfo,
    }
  );
  await card.save();

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Get all subtasks for a card
exports.getCardSubtasks = catchAsync(async (req, res, next) => {
  const { cardId } = req.params;

  // Get card with context and verify access
  const { card, board } = await getCardWithContext(cardId, req.user._id);

  // Verify view permission
  permissionService.verifyPermission(board, req.user._id, 'view_board');

  // Get populated subtasks
  const populatedCard = await Card.findById(cardId)
    .populate({
      path: 'subtasks',
      populate: [
        { path: 'assignedTo', select: 'email firstName lastName' },
        { path: 'completedBy', select: 'email firstName lastName' },
        { path: 'createdBy', select: 'email firstName lastName' },
      ],
    })
    .select('subtasks'); // Only select the subtasks field for efficiency

  // Sort subtasks by position
  const sortedSubtasks = populatedCard.subtasks.sort(
    (a, b) => a.position - b.position
  );

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

// // Get all cards in a list
// exports.getListCards = catchAsync(async (req, res, next) => {
//   const listId = req.params.listId;

//   // Find the list
//   const list = await List.findById(listId);
//   if (!list) {
//     return next(new AppError('List not found', 404));
//   }

//   // Find the board
//   const board = await Board.findById(list.board);
//   if (!board) {
//     return next(new AppError('Board not found', 404));
//   }

//   // Verify access
//   permissionService.verifyPermission(board, req.user._id, 'view_board');

//   // Get all cards in the list
//   const cards = await Card.find({ list: listId, archived: false })
//     .sort('position')
//     .populate({
//       path: 'members.user',
//       select: 'email firstName lastName avatar username',
//     })
//     .populate('createdBy', 'email firstName lastName')
//     .populate('subtasks.assignedTo', 'email firstName lastName');

//   res.status(200).json({
//     status: 'success',
//     results: cards.length,
//     data: {
//       cards,
//     },
//   });
// });

exports.getListCards = catchAsync(async (req, res, next) => {
  const listId = req.params.listId;
  const {
    priority,
    assignedTo,
    dueDateFilter,
    sortBy = 'position',
    sortOrder = 'asc',
  } = req.query;

  // Find the list and board (existing code remains the same)
  const list = await List.findById(listId);
  if (!list) return next(new AppError('List not found', 404));

  const board = await Board.findById(list.board);
  if (!board) return next(new AppError('Board not found', 404));

  permissionService.verifyPermission(board, req.user._id, 'view_board');

  // Build query (existing filter code remains the same)
  let query = { list: listId, archived: false };

  if (priority) {
    const validPriorityLevels = ['none', 'low', 'medium', 'high'];
    if (!validPriorityLevels.includes(priority)) {
      return next(new AppError('Invalid priority level', 400));
    }
    query.priority = priority;
  }

  if (assignedTo) {
    if (assignedTo === 'me') {
      query['members.user'] = req.user._id;
    } else {
      const isBoardMember = board.members.some(
        (member) => member.user.toString() === assignedTo
      );
      if (!isBoardMember) {
        return next(new AppError('Specified user is not a board member', 400));
      }
      query['members.user'] = assignedTo;
    }
  }

  if (dueDateFilter) {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    switch (dueDateFilter) {
      case 'overdue':
        query['dueDate.endDate'] = { $lt: new Date() };
        break;
      case 'dueSoon':
        query['dueDate.endDate'] = {
          $gte: new Date(),
          $lt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        };
        break;
      case 'dueThisWeek':
        query['dueDate.endDate'] = { $gte: today, $lte: weekEnd };
        break;
      case 'noDueDate':
        query['dueDate.endDate'] = { $exists: false };
        break;
      default:
        return next(new AppError('Invalid due date filter', 400));
    }
  }

  // Build sort object (updated implementation)
  let sort = {};
  if (sortBy === 'priority') {
    // We'll sort in memory after fetching
    sort = { position: 1 }; // Default sort for initial query
  } else if (sortBy === 'dueDate') {
    sort['dueDate.endDate'] = sortOrder === 'asc' ? 1 : -1;
  } else {
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
  }

  // Get cards
  let cards = await Card.find(query)
    .sort(sort)
    .populate({
      path: 'members.user',
      select: 'email firstName lastName avatar username',
    })
    .populate('createdBy', 'email firstName lastName')
    .populate('subtasks.assignedTo', 'email firstName lastName');

  // Apply custom priority sorting if needed
  if (sortBy === 'priority') {
    const priorityOrder = { none: 0, low: 1, medium: 2, high: 3 };
    cards.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] || 0;
      const bPriority = priorityOrder[b.priority] || 0;
      return sortOrder === 'asc'
        ? aPriority - bPriority
        : bPriority - aPriority;
    });
  }

  res.status(200).json({
    status: 'success',
    results: cards.length,
    data: {
      cards,
      filters: { priority, assignedTo, dueDateFilter, sortBy, sortOrder },
    },
  });
});

// Archive card
exports.archiveCard = catchAsync(async (req, res, next) => {
  const { cardId } = req.params;

  // Get card with context and verify access
  const { card, list, board } = await getCardWithContext(cardId, req.user._id);

  // Check if card is already archived
  if (card.archived) {
    return next(new AppError('Card is already archived', 400));
  }

  // Check permission to archive cards
  if (card.createdBy.toString() === req.user._id.toString()) {
    // If user created the card, they need edit_own_cards permission
    permissionService.verifyPermission(board, req.user._id, 'edit_own_cards');
  } else {
    // Otherwise, they need edit_cards permission
    permissionService.verifyPermission(board, req.user._id, 'edit_cards');
  }

  // Get current position before archiving
  const currentPosition = card.position;

  // Archive the card - All logic directly in controller
  card.originalPosition = currentPosition;
  card.archived = true;
  card.archivedAt = Date.now();
  card.archivedBy = req.user._id;
  await card.save();

  // Use existing recalculatePositions function to adjust positions
  // Decrement positions of cards after the archived card
  await recalculatePositions(card.list, currentPosition, false);

  // Get card members to notify (excluding the user archiving the card)
  const cardMembers = card.members
    .filter((member) => member.user.toString() !== req.user._id.toString())
    .map((member) => member.user);

  // Log the activity
  await activityService.logCardActivity(
    board,
    req.user._id,
    'card_archived',
    card._id,
    {
      title: card.title,
      listId: list._id,
      position: currentPosition,
    }
  );

  // Get all board members to notify - using the pattern that works
  const boardMembers = board.members.filter(
    (member) => member.user.toString() !== req.user._id.toString()
  );

  // Send notifications to board members
  for (const member of boardMembers) {
    await notificationService.createNotification(
      req.app.io,
      member.user,
      req.user._id,
      'card_archived',
      'card',
      card._id,
      {
        cardTitle: card.title,
        boardId: board._id,
        boardName: board.name,
        listName: list.name,
      }
    );
  }

  // Get all remaining cards in the list to send back updated positions
  const remainingCards = await Card.find({
    list: card.list,
    archived: false,
  })
    .sort('position')
    .populate('members.user', 'username email avatar')
    .populate('createdBy', 'username email avatar')
    .populate('labels');

  res.status(200).json({
    status: 'success',
    message: 'Card archived successfully',
    data: {
      card,
      remainingCards,
      list: {
        id: list._id,
        cardCount: remainingCards.length,
      },
    },
  });
});

// Restore card
exports.restoreCard = catchAsync(async (req, res, next) => {
  const { cardId } = req.params;

  // Get card with context and verify access
  const { card, list, board } = await getCardWithContext(cardId, req.user._id);

  // Check if card is archived
  if (!card.archived) {
    return next(new AppError('Card is not archived', 400));
  }

  // Check if the parent list is archived - if so, prevent card restoration
  if (list.archived) {
    return next(
      new AppError(
        `You should restore "${list.name}" for the card to be restored`,
        400
      )
    );
  }

  // Check permission to edit cards
  if (card.createdBy.toString() === req.user._id.toString()) {
    permissionService.verifyPermission(board, req.user._id, 'edit_own_cards');
  } else {
    permissionService.verifyPermission(board, req.user._id, 'edit_cards');
  }

  // Check if list has a card limit
  if (list.cardLimit) {
    // Count current non-archived cards in the list
    const currentCardCount = await Card.countDocuments({
      list: list._id,
      archived: false,
    });

    // Check if limit would be exceeded
    if (currentCardCount >= list.cardLimit) {
      return next(
        new AppError(
          `Cannot restore card. List "${list.name}" has reached its card limit of ${list.cardLimit}`,
          400
        )
      );
    }
  }

  // Get all current active cards in the same list
  const activeCards = await Card.find({
    list: card.list,
    archived: false,
  }).sort('position');

  // Determine target position - prefer original position but don't exceed current list length
  const targetPosition = Math.min(
    card.originalPosition || 0,
    activeCards.length // Ensure we don't exceed the current card count
  );

  // Use existing recalculatePositions to make space for the restored card
  await recalculatePositions(card.list, targetPosition, true);

  // Restore the card manually
  card.archived = false;
  card.archivedAt = undefined;
  card.archivedBy = undefined;
  card.position = targetPosition;
  card.originalPosition = undefined;
  await card.save();

  // Log the activity
  await activityService.logCardActivity(
    board,
    req.user._id,
    'card_restored',
    card._id,
    {
      title: card.title,
      listId: list._id,
      restoredPosition: targetPosition,
      originalPosition: card.originalPosition,
    }
  );

  // Get all board members to notify - using the pattern that works
  const boardMembers = board.members.filter(
    (member) => member.user.toString() !== req.user._id.toString()
  );

  // Send notifications to board members
  for (const member of boardMembers) {
    await notificationService.createNotification(
      req.app.io,
      member.user,
      req.user._id,
      'card_restored',
      'card',
      card._id,
      {
        cardTitle: card.title,
        boardId: board._id,
        boardName: board.name,
        listName: list.name,
      }
    );
  }

  const populatedCard = await Card.findById(card._id)
    .populate('members.user', 'username email avatar')
    .populate('createdBy', 'username email avatar')
    .populate('labels');

  res.status(200).json({
    status: 'success',
    message: 'Card restored successfully',
    data: populatedCard,
  });
});

// Get archived cards function for cardController.js
exports.getArchivedCards = catchAsync(async (req, res, next) => {
  const { boardId } = req.params;
  const { search = '', limit = 50, skip = 0, sort = '-archivedAt' } = req.query;

  // Find the board
  const board = await Board.findById(boardId);
  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  // Verify permission to view board
  permissionService.verifyPermission(board, req.user._id, 'view_board');

  // Find all lists in this board (including archived lists)
  const lists = await List.find({ board: boardId });
  const listIds = lists.map((list) => list._id);

  // Build base query
  let cardQuery = {
    list: { $in: listIds },
    archived: true,
  };

  // Add search condition if provided
  if (search) {
    cardQuery.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  // Get total count of matching archived cards
  const totalCount = await Card.countDocuments(cardQuery);

  // Build the query to fetch cards
  let cards = await Card.find(cardQuery)
    .sort(sort)
    .skip(parseInt(skip))
    .limit(parseInt(limit))
    .populate(
      'members.user',
      'email username firstName lastName avatar fullName'
    )
    .populate('createdBy', 'email username firstName lastName avatar fullName')
    .populate('archivedBy', 'email username firstName lastName avatar fullName')
    .populate('labels')
    .populate({
      path: 'list',
      select: 'name position archived',
    });

  res.status(200).json({
    status: 'success',
    totalCount,
    data: {
      archivedCards: cards,
    },
  });
});

// Delete archived card function for cardController.js
exports.deleteArchivedCard = catchAsync(async (req, res, next) => {
  const { cardId } = req.params;

  // Find card and verify it exists
  const card = await Card.findById(cardId);
  if (!card) {
    return next(new AppError('Card not found', 404));
  }

  // Find list and verify it exists
  const list = await List.findById(card.list);
  if (!list) {
    return next(new AppError('List not found', 404));
  }

  // Find board and verify it exists
  const board = await Board.findById(list.board);
  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  // Verify user is a board member
  const isMember = board.members.some(
    (member) => member.user.toString() === req.user._id.toString()
  );
  if (!isMember) {
    return next(
      new AppError('You must be a board member to access this card', 403)
    );
  }

  // Check if card is archived (can only delete archived cards with this endpoint)
  if (!card.archived) {
    return next(
      new AppError('Only archived cards can be deleted with this endpoint', 400)
    );
  }

  // Check permission to delete cards
  if (card.createdBy.toString() === req.user._id.toString()) {
    // Creator can delete their own card
    permissionService.verifyPermission(board, req.user._id, 'delete_own_cards');
  } else {
    // Otherwise need delete_cards permission
    permissionService.verifyPermission(board, req.user._id, 'delete_cards');
  }

  // Store card info for activity log
  const cardInfo = {
    title: card.title,
    listId: card.list,
    archived: true,
  };

  // Delete the card
  await card.deleteOne();

  // Log the activity
  await activityService.logCardActivity(
    board,
    req.user._id,
    'card_deleted',
    board._id, // Use board ID since card ID no longer exists
    {
      title: cardInfo.title,
      listId: cardInfo.listId,
      fromArchive: true,
    }
  );

  res.status(200).json({
    status: 'success',
    message: 'Archived card deleted successfully',
  });
});

// Add these functions to cardController.js

// Update card priority
exports.updatePriority = catchAsync(async (req, res, next) => {
  const { cardId } = req.params;
  const { priority } = req.body;

  // Validate priority level
  const validPriorityLevels = ['none', 'low', 'medium', 'high'];
  if (!validPriorityLevels.includes(priority)) {
    return next(
      new AppError(
        `Invalid priority level. Must be one of: ${validPriorityLevels.join(
          ', '
        )}`,
        400
      )
    );
  }

  // Get card with context and verify access
  const { card, board } = await getCardWithContext(cardId, req.user._id);

  // Verify permission to edit this card
  permissionService.verifyCardEdit(board, card, req.user._id);

  // Store original priority for activity log
  const originalPriority = card.priority;

  // Update the priority
  card.priority = priority;
  await card.save();

  // Log activity
  await activityService.logCardActivity(
    board,
    req.user._id,
    'card_updated',
    card._id,
    {
      field: 'priority',
      from: originalPriority,
      to: priority,
    }
  );

  res.status(200).json({
    status: 'success',
    data: {
      card,
    },
  });
});

// Filter cards by priority in a list/board
exports.filterCardsByPriority = catchAsync(async (req, res, next) => {
  const { boardId } = req.params;
  const { priority } = req.params;

  // Validate priority level
  const validPriorityLevels = ['none', 'low', 'medium', 'high'];
  if (!validPriorityLevels.includes(priority)) {
    return next(
      new AppError(
        `Invalid priority level. Must be one of: ${validPriorityLevels.join(
          ', '
        )}`,
        400
      )
    );
  }

  // Find the board
  const board = await Board.findById(boardId);
  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  // Verify access
  permissionService.verifyPermission(board, req.user._id, 'view_board');

  // Find all lists in this board
  const lists = await List.find({ board: boardId });
  const listIds = lists.map((list) => list._id);

  // Build query
  const query = {
    priority: priority,
    list: { $in: listIds },
    archived: false,
  };

  // Get cards
  const cards = await Card.find(query)
    .sort('position')
    .populate('members.user', 'email firstName lastName avatar username')
    .populate('createdBy', 'email firstName lastName avatar username')
    .populate('list', 'name');

  // Always return a response, even if no cards match the priority
  res.status(200).json({
    status: 'success',
    results: cards.length,
    data: {
      cards,
    },
  });
});

// Sort cards by priority
exports.getCardsSortedByPriority = catchAsync(async (req, res, next) => {
  const { boardId } = req.params;
  const { order = 'desc' } = req.query; // desc = highest priority first

  // Find the board
  const board = await Board.findById(boardId);
  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  // Verify access
  permissionService.verifyPermission(board, req.user._id, 'view_board');

  // Find all lists in this board
  const lists = await List.find({ board: boardId, archived: false });
  const listIds = lists.map((list) => list._id);

  // Get all non-archived cards in the board
  const cards = await Card.find({
    list: { $in: listIds },
    archived: false,
  }).populate('list', 'name');

  // Sort by priority level
  const priorityMap = {
    none: 0,
    low: 1,
    medium: 2,
    high: 3,
  };

  const sortedCards = cards.sort((a, b) => {
    const valA = priorityMap[a.priority] || 0;
    const valB = priorityMap[b.priority] || 0;

    return order === 'asc' ? valA - valB : valB - valA;
  });

  // Group by list for easier frontend display
  const cardsByList = {};

  sortedCards.forEach((card) => {
    const listId = card.list._id.toString();
    const listName = card.list.name;

    if (!cardsByList[listId]) {
      cardsByList[listId] = {
        listId,
        listName,
        cards: [],
      };
    }

    cardsByList[listId].cards.push(card);
  });

  res.status(200).json({
    status: 'success',
    results: sortedCards.length,
    data: {
      cards: sortedCards,
      cardsByList: Object.values(cardsByList),
    },
  });
});

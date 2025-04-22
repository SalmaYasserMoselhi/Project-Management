const List = require('../models/listModel');
const Board = require('../models/boardModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const activityService = require('../utils/activityService');
const permissionService = require('../utils/permissionService');

// Helper function to get list and its board with access verification
const getListWithBoard = async (listId, userId) => {
  // Find list and verify it exists
  const list = await List.findById(listId);
  if (!list) {
    throw new AppError('List not found', 404);
  }

  // Find board and verify it exists
  const board = await Board.findById(list.board);
  if (!board) {
    throw new AppError('Board not found', 404);
  }

  // Use permissionService to verify user has access to the board
  try {
    permissionService.verifyPermission(board, userId, 'view_board');
  } catch (error) {
    throw new AppError('You must be a board member to access this list', 403);
  }

  return { list, board };
};

// Helper function to handle duplicate key errors
const handleDuplicateNameError = (error) => {
  if (error.code === 11000 && error.keyPattern?.name) {
    return new AppError(
      'A list with this name already exists in this board, please choose a different name',
      400
    );
  }
  return error;
};

exports.createDefaultLists = async (boardId, userId) => {
  const defaultLists = [
    { name: 'To Do', position: 0 },
    { name: 'In Progress', position: 1 },
    { name: 'Done', position: 2 },
  ];

  const board = await Board.findById(boardId);
  if (!board) {
    throw new AppError('Board not found', 404);
  }

  // Create lists with error handling and cleanup
  const createdLists = [];

  try {
    // Create lists sequentially to ensure proper position ordering
    for (const listData of defaultLists) {
      const list = await List.create({
        ...listData,
        board: boardId,
        createdBy: userId,
      });
      createdLists.push(list);
    }

    return createdLists;
  } catch (error) {
    // If any error occurs, clean up any lists that were created
    if (createdLists.length > 0) {
      const listIds = createdLists.map((list) => list._id);
      await List.deleteMany({ _id: { $in: listIds } });
    }

    // Re-throw the error to be handled by the caller
    throw error;
  }
};

// Get a single list with its information and optionally its cards
exports.getList = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { includeCards = 'true', includeArchivedCards = 'false' } = req.query;

  // Find list and verify it exists
  const list = await List.findById(id);
  if (!list) {
    return next(new AppError('List not found', 404));
  }

  // Find board and verify it exists
  const board = await Board.findById(list.board);
  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  // Verify user has access to the board
  try {
    permissionService.verifyPermission(board, req.user._id, 'view_board');
  } catch (error) {
    return next(
      new AppError('You must be a board member to access this list', 403)
    );
  }

  // Prepare response data
  const responseData = {
    _id: list._id,
    name: list.name,
    position: list.position,
    cardLimit: list.cardLimit,
    board: list.board,
    createdBy: list.createdBy,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
    archived: list.archived,
  };

  // If list is archived, include archive information
  if (list.archived) {
    responseData.archivedAt = list.archivedAt;
    responseData.archivedBy = list.archivedBy;
    responseData.originalPosition = list.originalPosition;
  }

  // Include cards if requested
  if (includeCards === 'true') {
    // Build query for cards
    const cardQuery = { list: list._id };

    // Only include non-archived cards unless explicitly requested
    if (includeArchivedCards !== 'true') {
      cardQuery.archived = false;
    }

    // Get cards
    const cards = await Card.find(cardQuery)
      .sort('position')
      .populate({
        path: 'members.user',
        select: 'username email avatar',
      })
      .populate('labels')
      .populate('createdBy', 'username email avatar');

    // Add cards to response
    responseData.cards = cards;

    // Add card counts
    responseData.cardCounts = {
      total: cards.length,
      completed: cards.filter((card) => card.state.current === 'completed')
        .length,
      active: cards.filter((card) => card.state.current === 'active').length,
      overdue: cards.filter((card) => card.state.current === 'overdue').length,
    };

    // If including archived cards, separate them in the response
    if (includeArchivedCards === 'true') {
      responseData.cards = cards.filter((card) => !card.archived);
      responseData.archivedCards = cards.filter((card) => card.archived);
      responseData.cardCounts.archived = responseData.archivedCards.length;
      responseData.cardCounts.nonArchived = responseData.cards.length;
    }
  } else {
    // Even if not including cards, provide card counts
    const totalCards = await Card.countDocuments({ list: list._id });
    const activeCards = await Card.countDocuments({
      list: list._id,
      archived: false,
    });
    const archivedCards = await Card.countDocuments({
      list: list._id,
      archived: true,
    });

    responseData.cardCounts = {
      total: totalCards,
      active: activeCards,
      archived: archivedCards,
    };
  }

  res.status(200).json({
    status: 'success',
    data: { list: responseData },
  });
});

// Create a new list
exports.createList = catchAsync(async (req, res, next) => {
  const { board: boardId } = req.body;

  // Find the board
  const board = await Board.findById(boardId);
  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  // Check permission to create lists
  permissionService.verifyPermission(board, req.user._id, 'create_lists');

  try {
    // Create the list
    const list = await List.create({
      ...req.body,
      createdBy: req.user._id,
    });

    // Log the activity
    await activityService.logListActivity(
      board,
      req.user._id,
      'list_created',
      list._id,
      {
        name: list.name,
        position: list.position,
      }
    );

    res.status(201).json({
      status: 'success',
      data: { list },
    });
  } catch (error) {
    return next(handleDuplicateNameError(error));
  }
});

// Update list
exports.updateList = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Get list with its board and verify access
  const { list, board } = await getListWithBoard(id, req.user._id);

  // Check permission to edit lists
  permissionService.verifyPermission(board, req.user._id, 'edit_lists');

  // Only allow updating certain fields
  const allowedFields = ['name', 'cardLimit'];
  const filteredBody = {};
  Object.keys(req.body).forEach((field) => {
    if (allowedFields.includes(field)) {
      filteredBody[field] = req.body[field];
    }
  });

  // Track changes for activity log
  const changes = {};
  Object.keys(filteredBody).forEach((key) => {
    changes[key] = {
      from: list[key],
      to: filteredBody[key],
    };
  });

  const updatedList = await List.findByIdAndUpdate(id, filteredBody, {
    new: true,
    runValidators: true,
  });

  // Log the activity
  await activityService.logListActivity(
    board,
    req.user._id,
    'list_updated',
    list._id,
    {
      changes,
      updatedFields: Object.keys(filteredBody),
    }
  );

  res.status(200).json({
    status: 'success',
    data: { list: updatedList },
  });
});

// Helper function to resequence list positions
const resequenceListPositions = async (lists) => {
  if (!lists || lists.length === 0) return;

  const bulkOps = lists.map((list, index) => ({
    updateOne: {
      filter: { _id: list._id },
      update: { $set: { position: index } },
    },
  }));

  if (bulkOps.length > 0) {
    await List.bulkWrite(bulkOps);
  }
};

// Get all lists for a board
exports.getBoardLists = catchAsync(async (req, res, next) => {
  const boardId = req.params.boardId;

  // Find the board
  const board = await Board.findById(boardId);
  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  // Check permission to view board
  permissionService.verifyPermission(board, req.user._id, 'view_board');

  // Get all non-archived lists
  let lists = await List.find({
    board: boardId,
    archived: false,
  }).sort('position');

  // Check if positions are sequential
  const hasGaps = lists.some((list, index) => list.position !== index);

  if (hasGaps) {
    // Resequence positions if there are gaps
    await resequenceListPositions(lists);

    // Fetch updated lists
    lists = await List.find({
      board: boardId,
      archived: false,
    }).sort('position');
  }

  res.status(200).json({
    status: 'success',
    data: { lists },
  });
});

// Reorder list
exports.reorderList = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { position } = req.body;

  if (typeof position !== 'number') {
    return next(new AppError('Position must be a number', 400));
  }

  // Get list with its board and verify access
  const { list, board } = await getListWithBoard(id, req.user._id);

  // Check permission to edit lists
  permissionService.verifyPermission(board, req.user._id, 'edit_lists');

  // Store original position for activity log
  const originalPosition = list.position;

  // Reorder the list
  const reorderedList = await List.reorder(list.board, id, position);

  // Log the activity
  await activityService.logListActivity(
    board,
    req.user._id,
    'list_updated',
    list._id,
    {
      position: {
        from: originalPosition,
        to: reorderedList.position,
      },
    }
  );

  // Get all lists to send back updated positions
  const allLists = await List.find({
    board: list.board,
    archived: false,
  }).sort('position');

  res.status(200).json({
    status: 'success',
    data: {
      list: reorderedList,
      reorderedLists: allLists, // Send all lists so frontend can update all positions
    },
  });
});

// Enhanced archive list function
exports.archiveList = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Get list with its board and verify access
  const { list, board } = await getListWithBoard(id, req.user._id);

  // Check permission to archive lists
  permissionService.verifyPermission(board, req.user._id, 'archive_lists');

  // Check if list is already archived
  if (list.archived) {
    return next(new AppError('List is already archived', 400));
  }

  // Check if the list has cards
  const cardCount = await Card.countDocuments({
    list: list._id,
    archived: false,
  });

  // If force parameter is not provided and list has cards, require confirmation
  if (cardCount > 0 && req.query.force !== 'true') {
    return res.status(200).json({
      status: 'warning',
      message: `This list contains ${cardCount} cards that will also be archived. Confirm to proceed.`,
      data: {
        requireConfirmation: true,
        cardCount,
        listId: list._id,
      },
    });
  }

  try {
    // Get current position before archiving
    const currentPosition = list.position;

    // Find all cards in the list that aren't already archived
    const cards = await Card.find({ list: list._id, archived: false });

    // Archive the list
    await list.archive(req.user._id);

    // Archive all cards in the list
    for (const card of cards) {
      await card.archive(req.user._id);

      // Log card archive activity
      await activityService.logCardActivity(
        board,
        req.user._id,
        'card_archived',
        card._id,
        {
          title: card.title,
          listId: list._id,
          position: card.position,
          listArchive: true, // Indicate this was part of a list archive
        }
      );
    }

    // Log the list activity
    await activityService.logListActivity(
      board,
      req.user._id,
      'list_archived',
      list._id,
      {
        name: list.name,
        position: currentPosition,
        cardCount: cards.length,
      }
    );

    // Update positions of remaining lists
    await List.updateMany(
      {
        board: list.board,
        archived: false,
        position: { $gt: currentPosition },
      },
      { $inc: { position: -1 } }
    );

    // Get all remaining lists to send back updated positions
    const remainingLists = await List.find({
      board: list.board,
      archived: false,
    }).sort('position');

    res.status(200).json({
      status: 'success',
      message: 'List archived successfully',
      data: {
        list,
        lists: remainingLists,
        archivedCardCount: cards.length,
      },
    });
  } catch (error) {
    return next(new AppError(`Error archiving list: ${error.message}`, 500));
  }
});

// Enhanced restore list function
exports.restoreList = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { restoreCards = true } = req.body;

  // Get list with its board and verify access
  const { list, board } = await getListWithBoard(id, req.user._id);

  // Check permission to restore lists (same permission covers both archive/restore operations)
  permissionService.verifyPermission(board, req.user._id, 'archive_lists');

  // Check if list is archived
  if (!list.archived) {
    return next(new AppError('List is not archived', 400));
  }

  try {
    // Store the original position for activity log
    const originalPosition = list.originalPosition;

    // Restore the list
    await list.restore();

    // Log the activity
    await activityService.logListActivity(
      board,
      req.user._id,
      'list_restored',
      list._id,
      {
        name: list.name,
        position: list.position,
        originalPosition,
      }
    );

    // If restoreCards is true, also restore all archived cards in this list
    let restoredCardCount = 0;
    if (restoreCards) {
      // Find archived cards in this list
      const archivedCards = await Card.find({
        list: list._id,
        archived: true,
        // Only restore cards that were archived when the list was archived
        archivedAt: { $gte: list.archivedAt },
      });

      // Restore each card
      for (const card of archivedCards) {
        await card.restore();
        restoredCardCount++;

        // Log card restore activity
        await activityService.logCardActivity(
          board,
          req.user._id,
          'card_restored',
          card._id,
          {
            title: card.title,
            listId: list._id,
            position: card.position,
            listRestore: true, // Indicate this was part of a list restore
          }
        );
      }
    }

    // Get updated list and all lists, ensuring proper order
    const [updatedList, allLists, cards] = await Promise.all([
      List.findById(id),
      List.find({
        board: list.board,
        archived: false,
      }).sort('position'),
      Card.find({
        list: list._id,
        archived: false,
      })
        .sort('position')
        .populate('members.user', 'username email avatar')
        .populate('labels'),
    ]);

    res.status(200).json({
      status: 'success',
      message: `List restored successfully${
        restoredCardCount > 0 ? ` with ${restoredCardCount} cards` : ''
      }`,
      data: {
        list: updatedList,
        lists: allLists,
        cards,
        restoredCardCount,
      },
    });
  } catch (error) {
    return next(new AppError(`Error restoring list: ${error.message}`, 500));
  }
});

// Enhanced get archived lists function
exports.getArchivedLists = catchAsync(async (req, res, next) => {
  const { boardId } = req.params;
  const { withCards = false, limit = 10, skip = 0 } = req.query;

  // Find the board
  const board = await Board.findById(boardId);
  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  // Check permission to view board
  permissionService.verifyPermission(board, req.user._id, 'view_board');

  try {
    // Get total count
    const totalCount = await List.countDocuments({
      board: boardId,
      archived: true,
    });

    // Get archived lists with pagination
    const query = List.find({
      board: boardId,
      archived: true,
    })
      .sort('-archivedAt')
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .populate('archivedBy', 'username email avatar')
      .populate('createdBy', 'username email avatar');

    const lists = await query;

    // If requested, get archived cards for each list
    let listWithCards = [];
    if (withCards === 'true') {
      listWithCards = await Promise.all(
        lists.map(async (list) => {
          const cards = await Card.find({
            list: list._id,
            archived: true,
          })
            .sort('-archivedAt')
            .limit(5) // Limit to 5 most recently archived cards
            .populate('members.user', 'username email avatar')
            .populate('labels');

          const cardCount = await Card.countDocuments({
            list: list._id,
            archived: true,
          });

          return {
            ...list.toObject(),
            cards,
            cardCount,
            hasMoreCards: cardCount > 5,
          };
        })
      );
    }

    res.status(200).json({
      status: 'success',
      data: {
        lists: withCards === 'true' ? listWithCards : lists,
        totalCount,
        pagination: {
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: parseInt(skip) + lists.length < totalCount,
        },
      },
    });
  } catch (error) {
    return next(
      new AppError(`Error fetching archived lists: ${error.message}`, 500)
    );
  }
});

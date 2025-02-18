const List = require('../models/listModel');
const Board = require('../models/boardModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Helper function to check board membership and role
const checkBoardAccess = async (boardId, userId) => {
  const board = await Board.findById(boardId);
  if (!board) {
    throw new AppError('Board not found', 404);
  }

  const member = board.members.find(
    (m) => m.user.toString() === userId.toString()
  );

  if (!member) {
    throw new AppError(
      'You must be a board member to perform this action',
      403
    );
  }

  // return { board, member };
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

  // Create lists sequentially to ensure proper position ordering
  const lists = [];
  for (const listData of defaultLists) {
    const list = await List.create({
      ...listData,
      board: boardId,
      createdBy: userId,
    });
    lists.push(list);
  }

  // Update board with list references
  await Board.findByIdAndUpdate(
    boardId,
    { $set: { lists: lists.map((list) => list._id) } },
    { new: true }
  );

  return lists;
};

// Create a new list
exports.createList = catchAsync(async (req, res, next) => {
  const { board: boardId } = req.body;

  // Check board access
  await checkBoardAccess(boardId, req.user._id);

  try {
    // Create the list
    const list = await List.create({
      ...req.body,
      createdBy: req.user._id,
    });

    // Add list reference to board
    await Board.findByIdAndUpdate(boardId, {
      $push: { lists: list._id },
    });

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

  const list = await List.findById(id);
  if (!list) {
    return next(new AppError('List not found', 404));
  }

  // Check board access
  await checkBoardAccess(list.board, req.user._id);

  // Only allow updating certain fields
  const allowedFields = ['name', 'cardLimit'];
  const filteredBody = {};
  Object.keys(req.body).forEach((field) => {
    if (allowedFields.includes(field)) {
      filteredBody[field] = req.body[field];
    }
  });

  const updatedList = await List.findByIdAndUpdate(id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: { list: updatedList },
  });
});

// Get all lists for a board
exports.getBoardLists = catchAsync(async (req, res, next) => {
  const boardId = req.params.boardId;

  // Check board access
  await checkBoardAccess(boardId, req.user._id);

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

  const list = await List.findById(id);
  if (!list) {
    return next(new AppError('List not found', 404));
  }

  // Check board access
  await checkBoardAccess(list.board, req.user._id);

  // Reorder the list
  const reorderedList = await List.reorder(list.board, id, position);

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

// Get archived lists for a board
exports.getArchivedLists = catchAsync(async (req, res, next) => {
  const { boardId } = req.params;

  // Check board access
  await checkBoardAccess(boardId, req.user._id);

  // Get archived lists
  const lists = await List.find({
    board: boardId,
    archived: true,
  }).sort('-archivedAt');

  res.status(200).json({
    status: 'success',
    data: { lists },
  });
});

// Archive list
exports.archiveList = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const list = await List.findById(id);
  if (!list) {
    return next(new AppError('List not found', 404));
  }

  // Check if list is already archived
  if (list.archived) {
    return next(new AppError('List is already archived', 400));
  }

  // Check board access
  await checkBoardAccess(list.board, req.user._id);

  // Get current position before archiving
  const currentPosition = list.position;

  // Archive the list
  await list.archive(req.user._id);

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
    data: { lists: remainingLists },
  });
});

// Restore list
exports.restoreList = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const list = await List.findById(id);
  if (!list) {
    return next(new AppError('List not found', 404));
  }

  // Check if list is archived
  if (!list.archived) {
    return next(new AppError('List is not archived', 400));
  }

  // Check board access
  await checkBoardAccess(list.board, req.user._id);

  await list.restore();

  // Get updated list and all lists, ensuring proper order
  const [updatedList, allLists] = await Promise.all([
    List.findById(id),
    List.find({
      board: list.board,
      archived: false,
    }).sort('position'),
  ]);

  res.status(200).json({
    status: 'success',
    message: 'List restored successfully',
    data: {
      list: updatedList,
      lists: allLists,
    },
  });
});

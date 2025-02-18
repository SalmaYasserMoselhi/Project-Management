const crypto = require('crypto');
const Board = require('../models/boardModel');
const Workspace = require('../models/workspaceModel');
const User = require('../models/userModel');
const sendEmail = require('../utils/email');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { createDefaultLists } = require('../controllers/listController');

// Helper function to format board response
const formatBoardResponse = (board, userId) => ({
  id: board._id,
  name: board.name,
  description: board.description,
  background: board.background,
  workspace: {
    id: board.workspace._id,
    name: board.workspace.name,
    type: board.workspace.type,
  },
  userRole:
    board.members.find((m) => m.user.toString() === userId.toString())?.role ||
    'member',
  memberCount: board.members.length,
  isStarred: board.starred,
  lastActivity: board.updatedAt,
  viewPreferences: board.viewPreferences,
  lists: board.lists.map((list) => ({
    id: list._id,
    name: list.name,
    position: list.position,
    cardLimit: list.cardLimit,
    archived: list.archived,
    // cards: list.cards || [],
  })),
  settings: board.settings,
});

exports.getBoardMembers = catchAsync(async (req, res, next) => {
  const { id: boardId } = req.params;

  const board = await Board.findById(boardId)
    .populate({
      path: 'members.user',
      select: 'name email username',
    })
    .select('members');

  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  // Check if requesting user is a member
  const isMember = board.members.some(
    (member) => member.user._id.toString() === req.user._id.toString()
  );

  if (!isMember) {
    return next(
      new AppError('You must be a board member to view members', 403)
    );
  }

  // Format members data
  const members = board.members.map((member) => ({
    id: member.user._id,
    name: member.user.name,
    email: member.user.email,
    username: member.user.username,
    role: member.role,
    watchStatus: member.watchStatus,
    joinedAt: member.joinedAt,
  }));

  const stats = {
    total: members.length,
    byRole: {
      owner: members.filter((m) => m.role === 'owner').length,
      admin: members.filter((m) => m.role === 'admin').length,
      member: members.filter((m) => m.role === 'member').length,
    },
  };

  res.status(200).json({
    status: 'success',
    data: {
      members,
      stats,
    },
  });
});

// Create Board
exports.createBoard = catchAsync(async (req, res, next) => {
  const { workspace } = req.body;

  const workspaceDoc = await Workspace.findById(workspace).select(
    'name type createdBy members'
  );

  if (!workspaceDoc) {
    return next(new AppError('Workspace not found', 404));
  }

  const userWorkspaceMember = workspaceDoc.members.find(
    (member) => member.user.toString() === req.user._id.toString()
  );

  if (!userWorkspaceMember) {
    return next(new AppError('You are not a member of this workspace', 403));
  }

  // Check permissions based on workspace type
  if (workspaceDoc.type === 'private') {
    const isWorkspaceOwner =
      workspaceDoc.createdBy.toString() === req.user._id.toString();
    const hasOwnerRole = userWorkspaceMember.role === 'owner';

    if (!isWorkspaceOwner && !hasOwnerRole) {
      return next(
        new AppError(
          'Only workspace owner can create boards in private workspace',
          403
        )
      );
    }
  } else if (workspaceDoc.type === 'public') {
    if (!['owner', 'admin'].includes(userWorkspaceMember.role)) {
      return next(
        new AppError(
          'Only workspace owner and admins can create boards in public workspace',
          403
        )
      );
    }
  } else if (workspaceDoc.type === 'collaboration') {
    return next(
      new AppError('Cannot create boards in collaboration workspace', 403)
    );
  }

  const board = await Board.create({
    ...req.body,
    createdBy: req.user._id,
    members: [
      {
        user: req.user._id,
        role: 'owner',
        watchStatus: 'watching',
      },
    ],
  });

  // Create default lists and wait for them to complete
  const defaultLists = await createDefaultLists(board._id, req.user._id);

  // Get the fully populated board with its lists
  const populatedBoard = await Board.findById(board._id)
    .populate('workspace', 'name type')
    .populate({
      path: 'lists',
      select: 'name position archived',
      match: { archived: false },
      options: { sort: { position: 1 } },
    });

  if (!populatedBoard) {
    return next(new AppError('Error retrieving board after creation', 500));
  }

  res.status(201).json({
    status: 'success',
    data: {
      board: formatBoardResponse(populatedBoard, req.user._id),
    },
  });
});

/**
 * Get all boards for the current user
 * Includes boards where user is member, recent and starred boards
 */
exports.getUserBoards = catchAsync(async (req, res, next) => {
  let userBoards = await Board.find({
    'members.user': req.user._id,
    archived: false,
  })
    .populate('workspace', 'name type createdBy')
    .select(
      'name description background workspace members lists starred updatedAt viewPreferences settings'
    )
    .lean();

  const organizedBoards = {
    private: [],
    public: [],
    collaboration: [],
    recent: [],
    starred: [],
  };

  userBoards.forEach((board) => {
    const formattedBoard = formatBoardResponse(board, req.user._id);

    if (board.workspace.createdBy.toString() === req.user._id.toString()) {
      if (board.workspace.type === 'private') {
        organizedBoards.private.push(formattedBoard);
      } else if (board.workspace.type === 'public') {
        organizedBoards.public.push(formattedBoard);
      }
    } else {
      organizedBoards.collaboration.push(formattedBoard);
    }

    if (board.starred) {
      organizedBoards.starred.push(formattedBoard);
    }
  });

  // Add recent boards
  organizedBoards.recent = [...userBoards]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5)
    .map((board) => formatBoardResponse(board, req.user._id));

  const summary = {
    totalBoards: userBoards.length,
    totalStarred: organizedBoards.starred.length,
    byWorkspace: {
      private: organizedBoards.private.length,
      public: organizedBoards.public.length,
      collaboration: organizedBoards.collaboration.length,
    },
  };

  res.status(200).json({
    status: 'success',
    data: { boards: organizedBoards, summary },
  });
});

// Get boards for a specific workspace
exports.getWorkspaceBoards = catchAsync(async (req, res, next) => {
  const { workspaceId } = req.params;
  const { search, sort = '-updatedAt' } = req.query;

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }

  const isMember = workspace.members.some(
    (member) => member.user.toString() === req.user._id.toString()
  );

  if (!isMember) {
    return next(new AppError('You do not have access to this workspace', 403));
  }

  // Different query for collaboration workspace
  let query;
  if (workspace.type === 'collaboration') {
    // For collaboration workspace, find all boards where user is a member
    // but exclude boards from user's own workspaces
    const userOwnedWorkspaces = await Workspace.find({
      createdBy: req.user._id,
      type: { $ne: 'collaboration' },
    }).select('_id');

    const ownedWorkspaceIds = userOwnedWorkspaces.map((w) => w._id);

    query = {
      'members.user': req.user._id,
      workspace: { $nin: ownedWorkspaceIds },
      archived: false,
      ...(search && {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      }),
    };
  } else {
    // Regular query for other workspace types
    query = {
      workspace: workspaceId,
      archived: false,
      ...(search && {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      }),
    };
  }

  const boards = await Board.find(query)
    .select(
      'name description background members lists starred updatedAt viewPreferences settings'
    )
    .sort(sort)
    .lean();

  // Modified board formatting to exclude workspace info since it's at the top level
  const formattedBoards = boards.map((board) => ({
    id: board._id,
    name: board.name,
    description: board.description,
    background: board.background,
    userRole:
      board.members.find((m) => m.user.toString() === req.user._id.toString())
        ?.role || 'member',
    memberCount: board.members.length,
    isStarred: board.starred,
    lastActivity: board.updatedAt,
    viewPreferences: board.viewPreferences,
    lists: board.lists || [],
    settings: board.settings,
  }));

  res.status(200).json({
    status: 'success',
    data: {
      workspace: {
        id: workspace._id,
        name: workspace.name,
        type: workspace.type,
      },
      boards: formattedBoards,
      stats: {
        total: boards.length,
        starred: boards.filter((board) => board.starred).length,
      },
    },
  });
});

exports.updateBoard = catchAsync(async (req, res, next) => {
  const board = await Board.findById(req.params.id).populate(
    'workspace',
    'name type'
  );

  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  const member = board.members.find(
    (m) => m.user.toString() === req.user._id.toString()
  );

  if (!member) {
    return next(new AppError('You must be a board member to update it', 403));
  }

  if (!['admin', 'owner'].includes(member.role)) {
    return next(
      new AppError(
        'Only board admins and owners can update board settings',
        403
      )
    );
  }

  const allowedFields = [
    'name',
    'description',
    'background',
    'viewPreferences',
  ];

  if (['admin', 'owner'].includes(member.role)) {
    allowedFields.push('settings', 'permissions');
  }

  const filteredBody = {};
  Object.keys(req.body).forEach((field) => {
    if (allowedFields.includes(field)) {
      filteredBody[field] = req.body[field];
    }
  });

  if (filteredBody.settings) {
    filteredBody.settings = {
      ...board.settings,
      ...filteredBody.settings,
    };
  }

  if (filteredBody.permissions) {
    filteredBody.permissions = {
      ...board.permissions,
      ...filteredBody.permissions,
    };

    const validPermissionValues = ['admin', 'members'];
    Object.entries(filteredBody.permissions).forEach(([key, value]) => {
      if (!validPermissionValues.includes(value)) {
        delete filteredBody.permissions[key];
      }
    });
  }

  const updatedBoard = await Board.findByIdAndUpdate(
    req.params.id,
    filteredBody,
    { new: true, runValidators: true }
  ).populate('workspace', 'name type');

  updatedBoard.activities.push({
    user: req.user._id,
    action: 'updated',
    entityType: 'board',
    entityId: updatedBoard._id,
    data: {
      updatedFields: Object.keys(filteredBody),
    },
  });

  await updatedBoard.save();

  res.status(200).json({
    status: 'success',
    data: {
      board: formatBoardResponse(updatedBoard, req.user._id),
    },
  });
});

// Delete a board permanently
exports.deleteBoard = catchAsync(async (req, res, next) => {
  // Find board and populate necessary fields
  const board = await Board.findById(req.params.id).populate({
    path: 'workspace',
    select: 'type boards',
  });

  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  // Check if user has permission to delete
  const member = board.members.find(
    (m) => m.user.toString() === req.user._id.toString()
  );

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return next(
      new AppError(
        'Only board owners and admins can permanently delete boards',
        403
      )
    );
  }

  try {
    // 1. Remove board reference from workspace
    await Workspace.updateMany(
      { boards: board._id },
      { $pull: { boards: board._id } }
    );

    // 2. If workspace is public, remove board from all collaboration workspaces
    if (board.workspace.type === 'public') {
      await Workspace.updateMany(
        { type: 'collaboration' },
        { $pull: { boards: board._id } }
      );
    }

    // 3. Delete the board itself
    await Board.deleteOne({ _id: board._id });

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    return next(new AppError(`Error deleting board: ${error.message}`, 500));
  }
});

exports.inviteMemberByEmail = catchAsync(async (req, res, next) => {
  const { email, role = 'member' } = req.body;
  const boardId = req.params.id;

  if (!['admin', 'member'].includes(role)) {
    return next(new AppError('Invalid role. Must be admin or member', 400));
  }

  const board = await Board.findById(boardId)
    .populate('workspace', 'name type createdBy')
    .select('+members +invitations');

  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  const requester = board.members.find(
    (m) => m.user.toString() === req.user._id.toString()
  );

  if (!requester || !['admin', 'owner'].includes(requester.role)) {
    return next(
      new AppError('Only board admins and owners can invite members', 403)
    );
  }

  const invitedUser = await User.findOne({ email }).select('_id email');
  if (!invitedUser) {
    return next(new AppError('User with this email does not exist', 404));
  }

  if (
    board.members.some((m) => m.user.toString() === invitedUser._id.toString())
  ) {
    return next(new AppError('User is already a board member', 400));
  }

  try {
    const inviteToken = board.createInvitationToken(email, role, req.user._id);
    await board.save();

    const inviteUrl = `${process.env.BASE_URL}/boards/join/${inviteToken}`;

    const message = `
      <div style="background-color: #f6f9fc; padding: 20px; font-family: Arial, sans-serif;">
        <div style="background-color: white; padding: 20px; border-radius: 10px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #EFC235; text-align: center; font-size: 24px; margin-bottom: 20px;">Board Invitation</h2>
          <p style="color: #3a2d34; text-align: center; font-size: 16px;">You've been invited to join "${board.name}" board.</p>
          <p style="color: #3a2d34; text-align: center; font-size: 14px;">Role: ${role}</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background-color: #EFC235; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #3a2d34; text-align: center; font-size: 14px;">
            Once accepted, you'll find this board in your collaboration workspace.
          </p>
          <p style="color: #3a2d34; font-size: 14px; text-align: center; margin-bottom: 20px;">This invitation expires in 7 days.</p>
          <hr style="border: none; border-top: 1px solid #e6e6e6; margin: 20px 0;">
          <p style="color: #888; font-size: 12px; text-align: center;">If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      </div>
    `;

    await sendEmail({
      email,
      subject: `Invitation to join ${board.name} board`,
      message,
    });

    const populatedBoard = await Board.findById(board._id).populate(
      'workspace',
      'name type'
    );

    res.status(200).json({
      status: 'success',
      message: 'Invitation sent successfully',
      data: {
        board: formatBoardResponse(populatedBoard, req.user._id),
      },
    });
  } catch (error) {
    return next(
      new AppError('Error processing invitation: ' + error.message, 500)
    );
  }
});

exports.acceptInvitation = catchAsync(async (req, res, next) => {
  const { token } = req.params;

  const board = await Board.findOne({
    invitations: {
      $elemMatch: {
        token: crypto.createHash('sha256').update(token).digest('hex'),
        status: 'pending',
        tokenExpiresAt: { $gt: Date.now() },
      },
    },
  }).populate('workspace', 'name type');

  if (!board) {
    return next(new AppError('Invalid or expired invitation', 400));
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const invitation = board.invitations.find(
    (inv) => inv.token === hashedToken && inv.status === 'pending'
  );

  if (!invitation) {
    return next(new AppError('Invalid or expired invitation', 400));
  }

  const user = await User.findOne({ email: invitation.email });
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  try {
    let collaborationWorkspace = await Workspace.findOne({
      createdBy: user._id,
      type: 'collaboration',
    });

    if (!collaborationWorkspace) {
      collaborationWorkspace = await Workspace.create({
        name: `${user.name}'s Collaboration Workspace`,
        type: 'collaboration',
        createdBy: user._id,
        members: [{ user: user._id, role: 'owner' }],
      });
    }

    if (!board.members.some((m) => m.user.toString() === user._id.toString())) {
      board.members.push({
        user: user._id,
        role: invitation.role,
        watchStatus: 'tracking',
        invitedBy: invitation.invitedBy,
      });
    }

    board.invitations = board.invitations.filter(
      (inv) => inv.token !== hashedToken
    );
    await board.save();

    res.status(200).json({
      status: 'success',
      message: 'Successfully joined board',
      data: {
        board: formatBoardResponse(board, user._id),
      },
    });
  } catch (error) {
    return next(
      new AppError(`Error accepting invitation: ${error.message}`, 500)
    );
  }
});

exports.getPendingInvitations = catchAsync(async (req, res, next) => {
  const board = await Board.findById(req.params.id).select('+invitations');

  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  const member = board.members.find(
    (m) => m.user.toString() === req.user._id.toString()
  );

  if (!member || !['admin', 'owner'].includes(member.role)) {
    return next(
      new AppError('Only board admins and owners can view invitations', 403)
    );
  }

  const pendingInvitations = board.invitations
    .filter(
      (inv) => inv.status === 'pending' && inv.tokenExpiresAt > Date.now()
    )
    .map((inv) => ({
      email: inv.email,
      role: inv.role,
      invitedBy: inv.invitedBy,
      createdAt: inv.createdAt,
      expiresAt: inv.tokenExpiresAt,
    }));

  res.status(200).json({
    status: 'success',
    data: { invitations: pendingInvitations },
  });
});

/**
 * Cancel pending invitation for a board
 * @param {string} req.params.id - Board ID
 * @param {string} req.params.email - Invited email to cancel
 */
exports.cancelInvitation = catchAsync(async (req, res, next) => {
  const board = await Board.findById(req.params.id).select('+invitations');
  const { email } = req.params;

  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  const requester = board.members.find(
    (m) => m.user.toString() === req.user._id.toString()
  );

  if (!requester || !['admin', 'owner'].includes(requester.role)) {
    return next(
      new AppError('Only board admins and owners can cancel invitations', 403)
    );
  }

  board.invitations = board.invitations.filter((inv) => inv.email !== email);
  await board.save();

  res.status(200).json({
    status: 'success',
    message: 'Invitation cancelled successfully',
  });
});

/**
 * Remove member from board
 * @param {string} req.params.id - Board ID
 * @param {string} req.params.userId - User ID to remove
 */
exports.removeMember = catchAsync(async (req, res, next) => {
  const board = await Board.findById(req.params.id).populate(
    'workspace',
    'name type'
  );

  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  const requester = board.members.find(
    (m) => m.user.toString() === req.user._id.toString()
  );

  if (!requester || !['admin', 'owner'].includes(requester.role)) {
    return next(
      new AppError('Only board admins and owners can remove members', 403)
    );
  }

  const targetMember = board.members.find(
    (m) => m.user.toString() === req.params.userId
  );

  if (!targetMember) {
    return next(new AppError('Member not found in board', 404));
  }

  if (targetMember.role === 'owner') {
    return next(new AppError('Cannot remove board owner', 400));
  }

  if (board.workspace.type === 'collaboration' && board.members.length === 1) {
    await board.remove();
    return res.status(204).json({
      status: 'success',
      message: 'Board deleted as last member was removed',
    });
  }

  board.members = board.members.filter(
    (m) => m.user.toString() !== req.params.userId
  );
  await board.save();

  res.status(200).json({
    status: 'success',
    message: 'Member removed successfully',
    data: {
      board: formatBoardResponse(board, req.user._id),
    },
  });
});

exports.getArchivedBoards = catchAsync(async (req, res, next) => {
  const archivedBoards = await Board.find({
    'members.user': req.user._id,
    archived: true,
    archivedBy: req.user._id,
  })
    .populate({
      path: 'workspace',
      select: 'name type createdBy',
      populate: {
        path: 'createdBy',
        select: '_id',
      },
    })
    .select(
      'name description background workspace members lists archived archivedAt viewPreferences settings'
    )
    .sort('-archivedAt')
    .lean();

  const formattedBoards = archivedBoards.map((board) => ({
    ...formatBoardResponse(board, req.user._id),
    archivedAt: board.archivedAt,
  }));

  const stats = {
    total: formattedBoards.length,
    byWorkspaceType: {
      private: archivedBoards.filter(
        (board) =>
          board.workspace.type === 'private' &&
          board.workspace.createdBy?._id.toString() === req.user._id.toString()
      ).length,
      public: archivedBoards.filter(
        (board) =>
          board.workspace.type === 'public' &&
          board.workspace.createdBy?._id.toString() === req.user._id.toString()
      ).length,
      collaboration: archivedBoards.filter(
        (board) =>
          board.workspace.createdBy?._id.toString() !== req.user._id.toString()
      ).length,
    },
  };

  res.status(200).json({
    status: 'success',
    data: {
      boards: formattedBoards,
      stats,
    },
  });
});

exports.archiveBoard = catchAsync(async (req, res, next) => {
  const board = await Board.findById(req.params.id).populate(
    'workspace',
    'name type'
  );

  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  const isMember = board.members.some(
    (member) => member.user.toString() === req.user._id.toString()
  );

  if (!isMember) {
    return next(new AppError('You must be a board member to archive it', 403));
  }

  if (board.archived) {
    return next(new AppError('Board is already archived', 400));
  }

  board.archived = true;
  board.archivedAt = Date.now();
  board.archivedBy = req.user._id;

  await board.save();

  res.status(200).json({
    status: 'success',
    message: 'Board archived successfully',
    data: {
      board: formatBoardResponse(board, req.user._id),
    },
  });
});

exports.restoreBoard = catchAsync(async (req, res, next) => {
  const board = await Board.findById(req.params.id).populate(
    'workspace',
    'name type'
  );

  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  const isMember = board.members.some(
    (member) => member.user.toString() === req.user._id.toString()
  );

  if (!isMember) {
    return next(new AppError('You must be a board member to restore it', 403));
  }

  if (!board.archived) {
    return next(new AppError('Board is not archived', 400));
  }

  board.archived = false;
  board.archivedAt = undefined;
  board.archivedBy = undefined;

  await board.save();

  res.status(200).json({
    status: 'success',
    message: 'Board restored successfully',
    data: {
      board: formatBoardResponse(board, req.user._id),
    },
  });
});
/**
 * Star a board
 * @route PATCH /api/boards/:id/star
 */
exports.starBoard = catchAsync(async (req, res, next) => {
  const board = await Board.findById(req.params.id);

  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  // Check if user is a member of the board
  const isMember = board.members.some(
    (member) => member.user.toString() === req.user._id.toString()
  );

  if (!isMember) {
    return next(new AppError('You must be a board member to star it', 403));
  }

  // Check if board is already starred
  if (board.starred) {
    return next(new AppError('Board is already starred', 400));
  }

  // Star the board
  board.starred = true;
  await board.save();

  res.status(200).json({
    status: 'success',
    message: 'Board starred successfully',
    data: {
      board,
    },
  });
});

/**
 * Remove star from a board
 * @route PATCH /api/boards/:id/unstar
 */
exports.unstarBoard = catchAsync(async (req, res, next) => {
  const board = await Board.findById(req.params.id);

  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  // Check if user is a member of the board
  const isMember = board.members.some(
    (member) => member.user.toString() === req.user._id.toString()
  );

  if (!isMember) {
    return next(new AppError('You must be a board member to unstar it', 403));
  }

  // Check if board is not starred
  if (!board.starred) {
    return next(new AppError('Board is not starred', 400));
  }

  // Remove star from the board
  board.starred = false;
  await board.save();

  res.status(200).json({
    status: 'success',
    message: 'Board unstarred successfully',
    data: {
      board,
    },
  });
});

/**
 * Get boards starred by current user
 * @route GET /api/boards/me/starred
 * @access Private
 */
exports.getMyStarredBoards = catchAsync(async (req, res, next) => {
  const starredBoards = await Board.find({
    'members.user': req.user._id,
    starred: true,
    archived: false,
  })
    .populate({
      path: 'workspace',
      select: 'name type',
    })
    .populate({
      path: 'members.user',
      select: 'name email username',
    })
    .populate({
      path: 'createdBy',
      select: 'name email username',
    })
    .sort('-updatedAt');

  // Calculate some statistics
  const stats = {
    total: starredBoards.length,
    byWorkspaceType: {
      private: starredBoards.filter(
        (board) => board.workspace.type === 'private'
      ).length,
      public: starredBoards.filter((board) => board.workspace.type === 'public')
        .length,
      collaboration: starredBoards.filter(
        (board) => board.workspace.type === 'collaboration'
      ).length,
    },
  };

  res.status(200).json({
    status: 'success',
    data: {
      boards: starredBoards,
      stats,
    },
  });
});

exports.getBoardMembers = catchAsync(async (req, res, next) => {
  const { id: boardId } = req.params;

  const board = await Board.findById(boardId)
    .populate({
      path: 'members.user',
      select: 'name email username',
    })
    .select('members');

  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  // Check if requesting user is a member
  const isMember = board.members.some(
    (member) => member.user._id.toString() === req.user._id.toString()
  );

  if (!isMember) {
    return next(
      new AppError('You must be a board member to view members', 403)
    );
  }

  // Format members data
  const members = board.members.map((member) => ({
    id: member.user._id,
    name: member.user.name,
    email: member.user.email,
    username: member.user.username,
    role: member.role,
    watchStatus: member.watchStatus,
    joinedAt: member.joinedAt,
  }));

  const stats = {
    total: members.length,
    byRole: {
      owner: members.filter((m) => m.role === 'owner').length,
      admin: members.filter((m) => m.role === 'admin').length,
      member: members.filter((m) => m.role === 'member').length,
    },
  };

  res.status(200).json({
    status: 'success',
    data: {
      members,
      stats,
    },
  });
});

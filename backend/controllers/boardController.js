const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Board = require('../models/boardModel');
const Workspace = require('../models/workspaceModel');
const User = require('../models/userModel');
const List = require('../models/listModel');
const Card = require('../models/cardModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const permissionService = require('../utils/permissionService');
const activityService = require('../utils/activityService');
const invitationService = require('../utils/invitationService');
const { createDefaultLists } = require('../controllers/listController');
const notificationService = require('../utils/notificationService');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Helper function to format member data
const formatMemberData = (member) => {
  // Check if member or member.user is null/undefined
  if (!member || !member.user) {
    console.warn('Warning: Received invalid member data:', member);
    return {
      _id: member?._id || null,
      user: {
        _id: null,
        username: 'Unknown User',
        email: '',
        avatar: '',
      },
      role: member?.role || 'member',
      permissions: member?.permissions || [],
      joinedAt: member?.joinedAt || new Date(),
    };
  }

  // Normal case when member.user exists
  return {
    _id: member._id,
    user: {
      _id: member.user._id,
      username: member.user.username,
      email: member.user.email,
      avatar: member.user.avatar,
    },
    role: member.role,
    permissions: member.permissions,
    joinedAt: member.joinedAt,
  };
};

// Helper function to format board response
const formatBoardResponse = (board, userId) => ({
  id: board._id,
  name: board.name,
  description: board.description,
  workspace: board.workspace,
  createdBy: board.createdBy,
  memberCount: board.members ? board.members.length : 0,
  lastActivity: board.updatedAt,
  starred:
    board.starredByUsers &&
    board.starredByUsers.some(
      (entry) => entry.user.toString() === userId.toString()
    ),
  archived:
    board.archivedByUsers &&
    board.archivedByUsers.some(
      (entry) => entry.user.toString() === userId.toString()
    ),
  members: board.members ? board.members.map(formatMemberData) : [],
  lists: Array.isArray(board.lists)
    ? board.lists.map((list) => ({
        id: list._id,
        name: list.name,
        position: list.position,
        cardLimit: list.cardLimit || null,
        archived: list.archived || false,
        cards: Array.isArray(list.cards)
          ? list.cards.map((card) => ({
              id: card._id,
              title: card.title,
              description: card.description,
              position: card.position,
              dueDate: card.dueDate,
              state: card.state,
              members: card.members ? card.members.map(formatMemberData) : [],
              labels: card.labels || [],
              createdBy: card.createdBy,
              createdAt: card.createdAt,
              updatedAt: card.updatedAt,
              archived: card.archived || false,
              subtasks: card.subtasks
                ? card.subtasks.map((subtask) => ({
                    id: subtask._id,
                    title: subtask.title,
                    completed: subtask.completed,
                    completedAt: subtask.completedAt,
                    completedBy: subtask.completedBy,
                    position: subtask.position,
                    assignedTo: subtask.assignedTo
                      ? formatMemberData(subtask.assignedTo)
                      : null,
                    dueDate: subtask.dueDate,
                    createdAt: subtask.createdAt,
                    updatedAt: subtask.updatedAt,
                  }))
                : [],
              subtaskStats: card.subtasks
                ? {
                    total: card.subtasks.length,
                    completed: card.subtasks.filter((st) => st.completed)
                      .length,
                    inProgress: card.subtasks.filter((st) => !st.completed)
                      .length,
                  }
                : { total: 0, completed: 0, inProgress: 0 },
            }))
          : [],
      }))
    : [],
  settings: board.settings,
  activities: board.activities,
  // background: board.background,
  // viewPreferences: board.viewPreferences
});

// Middleware for checking board permissions with optional population
exports.checkBoardPermission = (permission, populateOptions = null) => {
  return catchAsync(async (req, res, next) => {
    let query = Board.findById(req.params.id);

    // Apply population if specified
    if (populateOptions) {
      query = query.populate(populateOptions);
    }

    const board = await query;

    if (!board) {
      return next(new AppError('Board not found', 404));
    }

    try {
      // Use permissionService to verify board permission
      permissionService.verifyPermission(board, req.user._id, permission);

      // Attach board to request for later use
      req.board = board;
      next();
    } catch (error) {
      return next(error);
    }
  });
};

// Get board by ID
exports.getBoardById = catchAsync(async (req, res, next) => {
  const board = req.board;

  // Fetch lists if they're not already populated
  const populatedBoard = !board.lists
    ? await Board.findById(board._id)
        .populate('workspace', 'name type')
        .populate('createdBy', 'username email avatar firstName lastName')
        .populate('members.user', 'username email avatar firstName lastName')
        .populate({
          path: 'lists',
          match: { archived: false },
          options: { sort: { position: 1 } },
          populate: {
            path: 'cards',
            match: { archived: false },
            options: { sort: { position: 1 } },
            populate: [
              {
                path: 'members.user',
                select: 'username email avatar firstName lastName',
              },
              {
                path: 'labels',
              },
              {
                path: 'createdBy',
                select: 'username email avatar firstName lastName',
              },
              {
                path: 'subtasks',
                options: { sort: { position: 1 } },
                populate: {
                  path: 'assignedTo.user',
                  select: 'username email avatar firstName lastName',
                },
              },
            ],
          },
        })
    : board;

  res.status(200).json({
    status: 'success',
    data: {
      board: formatBoardResponse(populatedBoard, req.user._id),
    },
  });
});

// Create Board
exports.createBoard = catchAsync(
  // Main function
  async (req, res, next) => {
    const { workspace } = req.body;

    const workspaceDoc = await Workspace.findById(workspace);
    if (!workspaceDoc) {
      return next(new AppError('Workspace not found', 404));
    }

    if (workspaceDoc.type === 'collaboration') {
      return next(
        new AppError(
          'Cannot create boards in collaboration workspace. This workspace is only for boards shared with you.',
          403
        )
      );
    }

    // Verify user is a workspace member with permissions
    const userWorkspaceMember = workspaceDoc.members.find(
      (member) => member.user.toString() === req.user._id.toString()
    );
    if (!userWorkspaceMember) {
      return next(new AppError('You are not a member of this workspace', 403));
    }

    const hasPermission = permissionService.hasWorkspacePermission(
      workspaceDoc,
      req.user._id,
      'create_boards'
    );

    if (!hasPermission) {
      return next(
        new AppError(
          'You do not have permission to create boards in this workspace',
          403
        )
      );
    }

    // Create the board
    const board = await Board.create({
      ...req.body,
      createdBy: req.user._id,
      members: [
        {
          user: req.user._id,
          role: 'owner',
        },
      ],
    });

    // Store board ID for potential cleanup
    req.createdBoardId = board._id;

    // Create default lists
    const defaultLists = await createDefaultLists(board._id, req.user._id);

    // Log board creation activity
    await activityService.logWorkspaceActivity(
      workspaceDoc,
      req.user._id,
      'board_created',
      {
        board: {
          name: board.name,
        },
      }
    );

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
      throw new Error('Error retrieving board after creation');
    }
    // Send notification to workspace members
    if (board.workspace) {
      const workspace = await Workspace.findById(board.workspace).populate(
        'members.user'
      );

      const recipients = workspace.members.filter(
        (member) => member.user._id.toString() !== req.user._id.toString()
      );

      for (const recipient of recipients) {
        await notificationService.createNotification(
          req.app.io,
          recipient.user._id,
          req.user._id,
          'board_created',
          'board',
          board._id,
          {
            boardName: board.name,
            workspaceName: workspace.name,
          }
        );
      }
    }
    res.status(201).json({
      status: 'success',
      data: {
        board: formatBoardResponse(populatedBoard, req.user._id),
      },
    });
  },
  // Cleanup function
  async (req, err) => {
    if (req.createdBoardId) {
      console.log(
        `Cleaning up after failed board creation for ID: ${req.createdBoardId}`
      );

      // Delete any created lists
      await List.deleteMany({ board: req.createdBoardId });

      // Delete the board itself
      await Board.findByIdAndDelete(req.createdBoardId);

      // Remove board reference from workspace if it was added
      if (req.body && req.body.workspace) {
        await Workspace.updateMany(
          { boards: req.createdBoardId },
          { $pull: { boards: req.createdBoardId } }
        );
      }
    }
  }
);

exports.updateBoard = catchAsync(async (req, res, next) => {
  const board = req.board;
  const userRole = board.members.find(
    (m) => m.user.toString() === req.user._id.toString()
  )?.role;

  const { settings, members, ...basicFields } = req.body;

  let updateData = {};

  // Handle basic properties (name, description, etc.)
  if (Object.keys(basicFields).length > 0) {
    const allowedBasicFields = ['name', 'description'];
    allowedBasicFields.forEach((field) => {
      if (basicFields[field] !== undefined) {
        updateData[field] = basicFields[field];
      }
    });
  }

  // Handle Settings Updates
  if (settings) {
    updateData.settings = { ...board.settings };

    // Critical settings (owner only)
    if (
      settings.general &&
      (settings.general.memberListCreation || settings.general.memberInvitation)
    ) {
      if (userRole !== 'owner') {
        return next(
          new AppError('Only board owner can modify critical settings', 403)
        );
      }

      if (settings.general.memberListCreation)
        updateData.settings.general.memberListCreation =
          settings.general.memberListCreation;
      if (settings.general.memberInvitation)
        updateData.settings.general.memberInvitation =
          settings.general.memberInvitation;
    }

    // General settings (owner & admin)
    const generalSettings = ['cardEditing', 'cardMoving'];
    if (
      generalSettings.some(
        (field) => settings.general && settings.general[field] !== undefined
      )
    ) {
      if (!['owner', 'admin'].includes(userRole)) {
        return next(
          new AppError(
            'Only owners and admins can modify general settings',
            403
          )
        );
      }

      generalSettings.forEach((field) => {
        if (settings.general && settings.general[field] !== undefined) {
          updateData.settings.general[field] = settings.general[field];
        }
      });
    }
  }

  // Log activities for basic fields and settings
  if (Object.keys(updateData).length > 0) {
    if (settings) {
      await activityService.logBoardActivity(
        board,
        req.user._id,
        'settings_updated',
        {
          updatedFields: settings.general ? Object.keys(settings.general) : [],
        }
      );

      const boardMembers = board.members
        .filter((member) => member.user.toString() !== req.user._id.toString())
        .map((member) => member.user);

      for (const memberId of boardMembers) {
        await notificationService.createNotification(
          req.app.io,
          memberId,
          req.user._id,
          'settings_updated',
          'board',
          board._id,
          {
            entityType: 'board',
            entityName: board.name,
            updatedSettings: settings.general
              ? Object.keys(settings.general)
              : [],
          }
        );
      }
    }

    if (Object.keys(basicFields).length > 0) {
      await activityService.logBoardActivity(
        board,
        req.user._id,
        'board_updated',
        {
          updatedFields: Object.keys(basicFields),
        }
      );
    }
  }

  // Handle Member Role Updates (similar to workspace)
  if (members && Array.isArray(members)) {
    for (const update of members) {
      const { user: userId, role } = update;

      if (!['admin', 'member'].includes(role)) {
        return next(new AppError('Invalid role. Must be admin or member', 400));
      }

      const targetMember = board.members.find(
        (m) => m.user.toString() === userId
      );

      if (!targetMember) {
        return next(new AppError('Member not found', 404));
      }

      if (targetMember.role === 'owner') {
        return next(new AppError("Cannot change board owner's role", 400));
      }

      // Save the previous role before any changes
      const previousRole = targetMember.role;

      // Handle promotion to admin (only owner can do this)
      if (role === 'admin' && previousRole === 'member') {
        if (userRole !== 'owner') {
          return next(
            new AppError('Only board owner can promote to admin', 403)
          );
        }
      }

      // Handle demotion from admin (only owner can do this)
      if (role === 'member' && previousRole === 'admin') {
        if (userRole !== 'owner') {
          return next(
            new AppError('Only board owner can demote an admin', 403)
          );
        }
      }

      // Calculate new permissions based on the role
      let newPermissions;
      switch (role) {
        case 'admin':
          newPermissions = [
            'manage_board',
            'archive_board',
            'manage_members',
            'create_lists',
            'edit_lists',
            'archive_lists',
            'create_cards',
            'edit_cards',
            'move_cards',
            'delete_cards',
            'assign_members',
            'create_labels',
            'comment',
            'view_board',
          ];
          break;
        case 'member':
          newPermissions = [
            'view_board',
            'create_cards',
            'edit_own_cards',
            'move_own_cards',
            'comment',
          ];
          break;
        default:
          newPermissions = targetMember.permissions;
      }

      // Use update operator for member updates
      await Board.updateOne(
        { _id: board._id, 'members.user': userId },
        {
          $set: {
            'members.$.role': role,
            'members.$.permissions': newPermissions,
          },
        }
      );

      // Log activity with previously saved role
      await activityService.logBoardActivity(
        board,
        req.user._id,
        'member_role_updated',
        {
          targetUser: userId,
          from: previousRole,
          to: role,
        }
      );
    }
  }

  // Update board with basic fields and settings
  if (Object.keys(updateData).length > 0) {
    await Board.updateOne({ _id: board._id }, { $set: updateData });
  }

  // ALWAYS get the latest board data after any updates
  const updatedBoard = await Board.findById(board._id)
    .populate('workspace', 'name type')
    .populate('lists');

  // Send notification to board members
  const recipients = board.members.filter(
    (member) => member.user._id.toString() !== req.user._id.toString()
  );

  for (const recipient of recipients) {
    await notificationService.createNotification(
      req.app.io,
      recipient.user._id,
      req.user._id,
      'board_updated',
      'board',
      board._id,
      {
        boardName: board.name,
        updatedFields: Object.keys(req.body),
      }
    );
  }
  res.status(200).json({
    status: 'success',
    data: {
      board: formatBoardResponse(updatedBoard, req.user._id),
    },
  });
});

// Delete a board permanently
exports.deleteBoard = catchAsync(async (req, res, next) => {
  const board = req.board;

  // Get the workspace for activity logging
  const workspace = await Workspace.findById(board.workspace);
  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }
  // Find all lists associated with this board
  const lists = await List.find({ board: board._id });

  // For each list, delete all its cards
  for (const list of lists) {
    await Card.deleteMany({ list: list._id });
  }

  // Delete all lists
  await List.deleteMany({ board: board._id });

  // Remove board reference from workspace
  await Workspace.updateMany(
    { boards: board._id },
    { $pull: { boards: board._id } }
  );

  // If workspace is public, remove board from all collaboration workspaces
  if (workspace.type === 'public') {
    await Workspace.updateMany(
      { type: 'collaboration' },
      { $pull: { boards: board._id } }
    );
  }
  // Send notification before deleting
  const recipients = board.members.filter(
    (member) => member.user._id.toString() !== req.user._id.toString()
  );

  for (const recipient of recipients) {
    await notificationService.createNotification(
      req.app.io,
      recipient.user._id,
      req.user._id,
      'board_deleted',
      'board',
      board._id,
      {
        boardName: board.name,
      }
    );
  }
  // Delete the board itself
  await Board.deleteOne({ _id: board._id });

  // Log activity
  await activityService.logWorkspaceActivity(
    workspace,
    req.user._id,
    'board_removed',
    {
      board: {
        name: board.name,
        id: board._id,
      },
    }
  );

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Get boards for a specific workspace
exports.getWorkspaceBoards = catchAsync(async (req, res, next) => {
  const { workspaceId } = req.params;
  const { search, sort = '-updatedAt', page = 1, limit = 10 } = req.query;
  const userId = req.user._id;
  const userIdString = userId.toString();

  // Validate numeric parameters
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  // Get workspace
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }

  const isMember = workspace.members.some(
    (member) => member.user.toString() === userIdString
  );

  if (!isMember) {
    return next(new AppError('You do not have access to this workspace', 403));
  }

  // Different query for collaboration workspace
  let query;
  if (workspace.type === 'collaboration') {
    // For collaboration workspace, find boards where:
    // 1. User is a direct member of the board
    // 2. BUT the board doesn't belong to any workspace where user is a member
    // 3. AND the board is not archived by the current user

    // First, find all workspaces where user is a member
    const userWorkspaces = await Workspace.find({
      'members.user': userId,
      type: { $ne: 'collaboration' },
    }).select('_id');

    const userWorkspaceIds = userWorkspaces.map((w) => w._id);

    query = {
      'members.user': userId,
      // Exclude boards that belong to any workspace where the user is a member
      workspace: { $nin: userWorkspaceIds },
      // Exclude boards archived by this user
      'archivedByUsers.user': { $ne: userId },
      ...(search && {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          // { description: { $regex: search, $options: 'i' } },
        ],
      }),
    };
  } else {
    // Regular query for other workspace types
    query = {
      workspace: workspaceId,
      // Exclude boards archived by this user
      'archivedByUsers.user': { $ne: userId },
      ...(search && {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          // { description: { $regex: search, $options: 'i' } },
        ],
      }),
    };
  }

  const boards = await Board.find(query)
    .select(
      'name description background members lists starredByUsers updatedAt settings'
    )
    .sort(sort)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Count boards starred by this user
  const starredBoardsCount = boards.reduce((count, board) => {
    const isStarredByUser =
      board.starredByUsers &&
      board.starredByUsers.some(
        (entry) => entry.user.toString() === userIdString
      );
    return isStarredByUser ? count + 1 : count;
  }, 0);

  const formattedBoards = boards.map((board) => ({
    id: board._id,
    name: board.name,
    description: board.description,
    background: board.background,
    userRole:
      board.members.find((m) => m.user.toString() === userIdString)?.role ||
      'member',
    memberCount: board.members.length,
    starred:
      (board.starredByUsers &&
        board.starredByUsers.some(
          (entry) => entry.user.toString() === userIdString
        )) ||
      false,
    lastActivity: board.updatedAt,
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
        starred: starredBoardsCount,
      },
    },
  });
});

exports.getBoardMembers = catchAsync(async (req, res, next) => {
  const board = req.board;
  const { sort = 'joinedAt', page = 1, limit = 10 } = req.query;

  // Validate numeric parameters
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  // Populate user details to get firstName and lastName
  const populatedBoard = await Board.findById(board._id).populate({
    path: 'members.user',
    select: '_id username email avatar firstName lastName',
  });

  // Filter out invalid members before mapping
  // const validMembers = board.members.filter(member => member && member.user);

  // Filter out invalid members before mapping
  const validMembers = populatedBoard.members.filter(
    (member) => member && member.user
  );

  // Apply formatMemberData and include firstName and lastName
  const members = validMembers.map((member) => {
    const formattedMember = formatMemberData(member);

    // Add firstName and lastName to the formatted member data
    if (member.user) {
      formattedMember.user.firstName = member.user.firstName || '';
      formattedMember.user.lastName = member.user.lastName || '';
    }

    return formattedMember;
  });

  // Apply formatMemberData only to valid members
  // const members = validMembers.map(formatMemberData);

  // Sorting logic
  const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
  const sortOrder = sort.startsWith('-') ? -1 : 1;

  members.sort((a, b) => {
    if (sortField === 'joinedAt') {
      return new Date(a[sortField]) - new Date(b[sortField]) * sortOrder;
    }
    return (a[sortField]?.localeCompare(b[sortField]) || 0) * sortOrder;
  });

  // Pagination
  const totalMembers = members.length;
  const paginatedMembers = members.slice(skip, skip + limitNum);

  res.status(200).json({
    status: 'success',
    data: {
      members: paginatedMembers,
      pagination: {
        total: totalMembers,
        page: pageNum,
        results: paginatedMembers.length,
        totalPages: Math.ceil(totalMembers / limitNum),
        limit: limitNum,
      },
    },
  });
});

// Invite a new member to the board by email
exports.inviteMembers = catchAsync(
  async (req, res, next) => {
    const board = req.board;
    const userRole = board.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    ).role;

    // Support both single invitation and bulk invitations
    const invitesArray = req.body.invites || [
      {
        email: req.body.email,
        role: req.body.role || 'member',
      },
    ];

    // Validate invites before processing
    for (const invite of invitesArray) {
      const { email, role = 'member' } = invite;

      // Only owners can invite admins
      if (role === 'admin' && userRole !== 'owner') {
        return next(new AppError('Only owners can invite admins', 403));
      }

      // Check if user exists
      const user = await User.findOne({ email: invite.email });
      if (!user) {
        return next(
          new AppError(`User with email ${invite.email} does not exist`, 404)
        );
      }

      if (board.members.some((member) => member.user.equals(user._id))) {
        return next(
          new AppError(
            `User with email ${email} is already a board member`,
            400
          )
        );
      }

      // Check for existing pending invitation
      const existingInvitation = board.invitations.find(
        (inv) => inv.email === email && inv.status === 'pending'
      );
      if (existingInvitation) {
        return next(new AppError(`Invitation already sent to ${email}`, 400));
      }
    }

    // Store original invitations state for potential rollback
    req.originalInvitations = [...board.invitations];
    req.boardId = board._id;

    // Process bulk invitations using the invitationService
    const invitationResults = await invitationService.processBulkInvitations(
      board,
      invitesArray,
      req.user._id,
      'board',
      process.env.BASE_URL
    );

    // Log activity for each successful invitation
    for (const invitation of invitationResults) {
      await activityService.logBoardActivity(
        board,
        req.user._id,
        'invitation_sent',
        {
          email: invitation.email,
          role: invitation.role,
        }
      );
    }

    // Save the board to ensure invitations are stored
    await board.save();

    res.status(200).json({
      status: 'success',
      message: `Successfully sent ${invitationResults.length} invitation(s)`,
      data: {
        invitationResults,
      },
    });
  }, // Cleanup function
  async (req, err) => {
    if (req.boardId && req.originalInvitations) {
      console.log(`Restoring original invitations for board ${req.boardId}`);

      // Restore original invitations state
      await Board.findByIdAndUpdate(req.boardId, {
        invitations: req.originalInvitations,
      });
    }
  }
);

// Accept invitation to join a board
exports.acceptInvitation = catchAsync(
  async (req, res, next) => {
    const { token } = req.params;

    // Get frontend URL from environment variables
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Find board by token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const board = await Board.findOne({
      invitations: {
        $elemMatch: {
          token: hashedToken,
          status: 'pending',
          tokenExpiresAt: { $gt: Date.now() },
        },
      },
    }).populate('workspace', 'name type');

    if (!board) {
      return next(new AppError('Invalid or expired invitation', 400));
    }

    // if (!board) {
    //   // Redirect to frontend with error message
    //   return res.redirect(`${frontendUrl}/invitation-error?message=Invalid+or+expired+invitation`);
    // }

    // Use invitationService to verify token
    const invitation = invitationService.verifyInvitationToken(board, token);

    if (!invitation) {
      return next(new AppError('Invalid or expired invitation', 400));
    }

    // if (!invitation) {
    //   // Redirect to frontend with error message
    //   return res.redirect(`${frontendUrl}/invitation-error?message=Invalid+or+expired+invitation`);
    // }

    // Find user
    let user = await User.findOne({ email: invitation.email });
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Store information for potential rollback
    req.invitationInfo = {
      boardId: board._id,
      invitation: invitation,
      userId: user._id,
      originalBoardMembers: [...board.members],
      originalInvitations: [...board.invitations],
      createdWorkspace: false,
    };

    // Find or create user's collaboration workspace
    let collaborationWorkspace = await Workspace.findOne({
      createdBy: user._id,
      type: 'collaboration',
    });

    if (!collaborationWorkspace) {
      collaborationWorkspace = await Workspace.create({
        name: 'Collaboration Workspace',
        description: 'Access boards shared by others',
        type: 'collaboration',
        createdBy: user._id,
        members: [{ user: user._id, role: 'owner' }],
      });

      // Mark that we created a new w2orkspace (for potential cleanup)
      req.invitationInfo.createdWorkspace = true;
      req.invitationInfo.workspaceId = collaborationWorkspace._id;
    }

    // Use invitationService to accept the invitation
    await invitationService.acceptInvitation(board, invitation, user, {
      entityType: 'board',
    });

    // Log activity
    await activityService.logBoardActivity(
      board,
      user._id,
      'invitation_accepted',
      {
        invitedBy: invitation.invitedBy,
        role: invitation.role,
      }
    );
    await notificationService.createNotification(
      global.io,
      invitation.invitedBy,
      user._id,
      'invitation_accepted',
      'board',
      board._id,
      {
        boardName: board.name,
        role: invitation.role,
      }
    );

    // Create authentication token and set cookie
    const jwtToken = signToken(user._id);
    res.cookie('jwt', jwtToken, {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });

    // Redirect to board page on frontend
    return res.redirect(
      `${frontendUrl}/main/workspaces/${board.workspace._id}/boards/${
        board._id
      }?joined=true&boardName=${encodeURIComponent(board.name)}&role=${
        invitation.role
      }`
    );
  },
  // Cleanup function
  async (req, err) => {
    if (req.invitationInfo) {
      console.log(
        `Cleaning up after failed invitation acceptance for board: ${req.invitationInfo.boardId}`
      );

      // Restore original board members and invitations
      if (req.invitationInfo.boardId) {
        await Board.findByIdAndUpdate(req.invitationInfo.boardId, {
          members: req.invitationInfo.originalBoardMembers,
          invitations: req.invitationInfo.originalInvitations,
        });
      }

      // Delete created workspace if one was created during this operation
      if (
        req.invitationInfo.createdWorkspace &&
        req.invitationInfo.workspaceId
      ) {
        await Workspace.findByIdAndDelete(req.invitationInfo.workspaceId);
      }
    }
  }
);

// Get pending invitations for a board
exports.getPendingInvitations = catchAsync(async (req, res, next) => {
  const board = req.board;

  // Clean up expired invitations using invitationService
  invitationService.cleanExpiredInvitations(board);

  // Return only pending invitations
  const pendingInvitations = board.invitations.filter(
    (inv) => inv.status === 'pending' && inv.tokenExpiresAt > Date.now()
  );

  res.status(200).json({
    status: 'success',
    data: {
      invitations: pendingInvitations,
    },
  });
});

// Cancel pending invitation
exports.cancelInvitation = catchAsync(async (req, res, next) => {
  const board = req.board;
  const { email } = req.params;

  // Find invitation to be cancelled
  const invitation = board.invitations.find(
    (inv) => inv.email === email && inv.status === 'pending'
  );

  if (!invitation) {
    return next(new AppError(`No pending invitation found for ${email}`, 404));
  }

  const invitedUser = await User.findOne({ email: invitation.email });
  if (invitedUser) {
    await notificationService.createNotification(
      req.app.io,
      invitedUser._id,
      req.user._id,
      'invitation_cancelled',
      'board',
      board._id,
      {
        boardName: board.name,
        role: invitation.role,
      }
    );
  }

  // Use invitationService to cancel invitation
  const cancelled = invitationService.cancelInvitation(board, email);

  if (cancelled) {
    // Log the activity
    await activityService.logBoardActivity(
      board,
      req.user._id,
      'invitation_cancelled',
      {
        email: invitation.email,
        role: invitation.role,
      }
    );

    await board.save();
  }

  res.status(200).json({
    status: 'success',
    message: 'Invitation cancelled',
  });
});

// Remove member from board
exports.removeMemberFromBoard = catchAsync(async (req, res, next) => {
  const { boardId, memberId } = req.params;

  const board = await Board.findById(boardId);
  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  permissionService.verifyPermission(board, req.user._id, 'manage_members');

  const memberToRemove = board.members.find(
    (m) => m.user && m.user.toString() === memberId
  );

  if (!memberToRemove) {
    // If member not found, it might be because the user was deleted.
    // We still need to clean up their references.
    const userExists = await User.findById(memberId);
    if (!userExists) {
      board.members = board.members.filter(
        (m) => m.user && m.user.toString() !== memberId
      );
    } else {
      return next(new AppError('Member not found on this board', 404));
    }
  } else {
    if (memberToRemove.role === 'owner') {
      return next(new AppError('Cannot remove the board owner', 400));
    }
    board.members.pull(memberToRemove._id);
  }

  await Card.updateMany(
    { board: boardId, 'members.user': memberId },
    { $pull: { members: { user: memberId } } }
  );

  await board.save();

  res.status(204).send();
});

// Leave board
exports.leaveBoard = catchAsync(async (req, res, next) => {
  const board = req.board;
  const userId = req.user._id;

  // Remove user from board members
  board.members = board.members.filter(
    (member) => member.user.toString() !== userId.toString()
  );

  await board.save();

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getArchivedBoards = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const { sort = '-archivedAt', page = 1, limit = 10 } = req.query;

  // Validate numeric parameters
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  // Base query
  const query = {
    'members.user': userId,
    'archivedByUsers.user': userId,
  };

  // Get total count
  const totalBoards = await Board.countDocuments(query);

  // Find boards where the current user is in archivedByUsers array
  const archivedBoards = await Board.find({
    'members.user': userId,
    'archivedByUsers.user': userId,
  })
    .sort(sort)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Filter out boards with missing workspace data
  const validBoards = archivedBoards.filter((board) => board.workspace);

  const formattedBoards = validBoards.map((board) => {
    // Find the user's archive entry to get their specific archivedAt date
    const userArchiveEntry = board.archivedByUsers.find(
      (entry) => entry.user.toString() === userId.toString()
    );

    return {
      ...formatBoardResponse(board, userId),
      archivedAt: userArchiveEntry ? userArchiveEntry.archivedAt : null,
    };
  });

  const stats = {
    total: formattedBoards.length,
    byWorkspaceType: {
      private: validBoards.filter(
        (board) =>
          board.workspace?.type === 'private' &&
          board.workspace?.createdBy?._id.toString() === userId.toString()
      ).length,
      public: validBoards.filter(
        (board) =>
          board.workspace?.type === 'public' &&
          board.workspace?.createdBy?._id.toString() === userId.toString()
      ).length,
      collaboration: validBoards.filter(
        (board) =>
          board.workspace?.createdBy?._id.toString() !== userId.toString()
      ).length,
    },
  };

  res.status(200).json({
    status: 'success',
    data: {
      boards: formattedBoards,
      stats,
      pagination: {
        total: totalBoards,
        page: pageNum,
        results: archivedBoards.length,
        totalPages: Math.ceil(totalBoards / limitNum),
        limit: limitNum,
      },
    },
  });
});

exports.archiveBoard = catchAsync(async (req, res, next) => {
  const board = req.board;
  const userId = req.user._id;

  // Check if board is already archived by this user
  const isArchivedByUser =
    board.archivedByUsers &&
    board.archivedByUsers.some(
      (entry) => entry.user.toString() === userId.toString()
    );

  if (isArchivedByUser) {
    return next(new AppError('Board is already archived by you', 400));
  }

  // Add user to archivedByUsers array
  if (!board.archivedByUsers) {
    board.archivedByUsers = [];
  }

  board.archivedByUsers.push({
    user: userId,
    archivedAt: Date.now(),
  });

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
  const board = req.board;
  const userId = req.user._id;

  // Check if board is archived by this user
  const isArchivedByUser =
    board.archivedByUsers &&
    board.archivedByUsers.some(
      (entry) => entry.user.toString() === userId.toString()
    );

  if (!isArchivedByUser) {
    return next(new AppError('Board is not archived by you', 400));
  }

  // Remove user from archivedByUsers array
  board.archivedByUsers = board.archivedByUsers.filter(
    (entry) => entry.user.toString() !== userId.toString()
  );

  await board.save();

  res.status(200).json({
    status: 'success',
    message: 'Board restored successfully',
    data: {
      board: formatBoardResponse(board, req.user._id),
    },
  });
});

// Star a board with a limit of 5 per workspace
exports.starBoard = catchAsync(async (req, res, next) => {
  const board = req.board;
  const userId = req.user._id;
  const workspaceId = board.workspace;

  // Check if board is already starred by this user
  const isStarredByUser =
    board.starredByUsers &&
    board.starredByUsers.some(
      (entry) => entry.user.toString() === userId.toString()
    );

  if (isStarredByUser) {
    return next(new AppError('Board is already starred by you', 400));
  }

  // Count how many boards the user has already starred in this workspace
  const starredBoardsCount = await Board.countDocuments({
    workspace: workspaceId,
    'starredByUsers.user': userId,
  });

  // Check if the user has reached the limit of 5 starred boards per workspace
  if (starredBoardsCount >= 5) {
    return next(
      new AppError(
        'You have reached the limit of 5 starred boards per workspace. Please unstar a board before starring a new one.',
        400
      )
    );
  }

  // Add user to starredByUsers array
  if (!board.starredByUsers) {
    board.starredByUsers = [];
  }

  board.starredByUsers.push({
    user: userId,
    starredAt: Date.now(),
  });

  await board.save();

  res.status(200).json({
    status: 'success',
    message: 'Board starred successfully',
    data: {
      board: formatBoardResponse(board, req.user._id),
      starredBoardsCount: starredBoardsCount + 1,
      remainingStars: 4 - starredBoardsCount, // How many more boards the user can star
    },
  });
});

// Unstar a board
exports.unstarBoard = catchAsync(async (req, res, next) => {
  const board = req.board;
  const userId = req.user._id;

  // Check if board is starred by this user
  const isStarredByUser =
    board.starredByUsers &&
    board.starredByUsers.some(
      (entry) => entry.user.toString() === userId.toString()
    );

  if (!isStarredByUser) {
    return next(new AppError('Board is not starred by you', 400));
  }

  // Remove user from starredByUsers array
  board.starredByUsers = board.starredByUsers.filter(
    (entry) => entry.user.toString() !== userId.toString()
  );

  await board.save();

  res.status(200).json({
    status: 'success',
    message: 'Board unstarred successfully',
    data: {
      board: formatBoardResponse(board, req.user._id),
    },
  });
});

// Get starred boards for the current user with counts per workspace
exports.getMyStarredBoards = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  // Find boards that the user has starred
  const starredBoards = await Board.find({
    'members.user': userId,
    'starredByUsers.user': userId,
    // Don't show boards the user has archived
    'archivedByUsers.user': { $ne: userId },
  })
    .populate('workspace', 'name type')
    .populate('members.user', 'name email username')
    .populate('createdBy', 'name email username')
    .sort('-updatedAt');

  // Format response
  const formattedBoards = starredBoards.map((board) =>
    formatBoardResponse(board, userId)
  );

  // Calculate statistics
  const stats = {
    total: formattedBoards.length,
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

  // Group by workspaces and count stars
  const workspaceStars = {};
  starredBoards.forEach((board) => {
    const workspaceId = board.workspace._id.toString();
    if (!workspaceStars[workspaceId]) {
      workspaceStars[workspaceId] = {
        name: board.workspace.name,
        type: board.workspace.type,
        starredCount: 0,
        remainingStars: 5,
      };
    }
    workspaceStars[workspaceId].starredCount++;
    workspaceStars[workspaceId].remainingStars =
      5 - workspaceStars[workspaceId].starredCount;
  });

  res.status(200).json({
    status: 'success',
    data: {
      boards: formattedBoards,
      stats,
      workspaceStarLimits: Object.values(workspaceStars),
    },
  });
});

// Get archived boards for a specific workspace
exports.getWorkspaceArchivedBoards = catchAsync(async (req, res, next) => {
  const { workspaceId } = req.params;
  const userId = req.user._id;

  // Find the workspace
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }

  // Verify user is a workspace member
  const isMember = workspace.members.some(
    (member) => member.user.toString() === userId.toString()
  );

  if (!isMember) {
    return next(new AppError('You do not have access to this workspace', 403));
  }

  // Find boards that belong to this workspace AND that the current user has archived
  const archivedBoards = await Board.find({
    workspace: workspaceId,
    'archivedByUsers.user': userId,
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
      'name description background workspace members lists archivedByUsers viewPreferences settings'
    )
    .sort('-archivedByUsers.archivedAt') // Sort by archive date (most recent first)
    .lean();

  // Format the board responses for the client
  const formattedBoards = archivedBoards.map((board) => {
    // Find the user's archive entry to get their specific archivedAt date
    const userArchiveEntry = board.archivedByUsers.find(
      (entry) => entry.user.toString() === userId.toString()
    );

    return {
      ...formatBoardResponse(board, userId),
      archivedAt: userArchiveEntry ? userArchiveEntry.archivedAt : null,
    };
  });

  // Calculate statistics
  const stats = {
    total: formattedBoards.length,
    byWorkspaceType: {
      private: archivedBoards.filter(
        (board) =>
          board.workspace?.type === 'private' &&
          board.workspace?.createdBy?._id.toString() === userId.toString()
      ).length,
      public: archivedBoards.filter(
        (board) =>
          board.workspace?.type === 'public' &&
          board.workspace?.createdBy?._id.toString() === userId.toString()
      ).length,
      collaboration: archivedBoards.filter(
        (board) =>
          board.workspace?.createdBy?._id.toString() !== userId.toString()
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

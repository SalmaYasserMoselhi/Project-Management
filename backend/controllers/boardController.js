const crypto = require('crypto');
const Board = require('../models/boardModel');
const Workspace = require('../models/workspaceModel');
const User = require('../models/userModel');
const sendEmail = require('../utils/email');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Create Board
exports.createBoard = catchAsync(async (req, res, next) => {
  const { workspace } = req.body;

  // Check workspace exists
  const workspaceDoc = await Workspace.findById(workspace).populate(
    'members.user',
    'name email'
  );

  if (!workspaceDoc) {
    return next(new AppError('Workspace not found', 404));
  }

  // Get user's role in workspace
  const userWorkspaceMember = workspaceDoc.members.find(
    (member) => member.user._id.toString() === req.user._id.toString()
  );

  if (!userWorkspaceMember) {
    return next(new AppError('You are not a member of this workspace', 403));
  }

  // Check creation permissions based on workspace type

  // Check permissions based on workspace type
  if (workspaceDoc.type === 'private') {
    // For private workspace, check if user is the workspace owner or has owner role
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

  res.status(201).json({
    status: 'success',
    data: {
      board,
    },
  });
});

exports.inviteMemberByEmail = catchAsync(async (req, res, next) => {
  const { email, role = 'member' } = req.body;
  const boardId = req.params.id;

  // 1. Validate role
  if (!['admin', 'member'].includes(role)) {
    return next(new AppError('Invalid role. Must be admin or member', 400));
  }

  // 2. Get the board and check permissions
  const board = await Board.findById(boardId)
    .populate('workspace')
    .populate('members.user');

  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  // 3. Check if requester has permission to invite
  const requester = board.members.find(
    (m) => m.user._id.toString() === req.user._id.toString()
  );

  if (!requester || !['admin', 'owner'].includes(requester.role)) {
    return next(
      new AppError('Only board admins and owners can invite members', 403)
    );
  }

  // 4. Check if user exists
  const invitedUser = await User.findOne({ email });
  if (!invitedUser) {
    return next(new AppError('User with this email does not exist', 404));
  }

  // 5. Check if user is already a board member
  if (
    board.members.some(
      (m) => m.user._id.toString() === invitedUser._id.toString()
    )
  ) {
    return next(new AppError('User is already a board member', 400));
  }

  try {
    // 6. Create invitation token
    const inviteToken = board.createInvitationToken(email, role, req.user._id);
    await board.save();

    // 7. Generate invitation URL
    const inviteUrl = `${process.env.BASE_URL}/boards/join/${inviteToken}`;

    // 8. Send invitation email
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

    res.status(200).json({
      status: 'success',
      message: 'Invitation sent successfully',
    });
  } catch (error) {
    return next(
      new AppError('Error processing invitation: ' + error.message, 500)
    );
  }
});

exports.acceptInvitation = catchAsync(async (req, res, next) => {
  const { token } = req.params;

  // 1. Verify token and get board
  const board = await Board.findOne({
    invitations: {
      $elemMatch: {
        token: crypto.createHash('sha256').update(token).digest('hex'),
        status: 'pending',
        tokenExpiresAt: { $gt: Date.now() },
      },
    },
  }).populate('workspace');

  if (!board) {
    return next(new AppError('Invalid or expired invitation', 400));
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // 2. Find invitation
  const invitation = board.invitations.find(
    (inv) => inv.token === hashedToken && inv.status === 'pending'
  );

  if (!invitation) {
    return next(new AppError('Invalid or expired invitation', 400));
  }

  // 3. Get user by email
  const user = await User.findOne({ email: invitation.email });
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  try {
    // 4. Find or create collaboration workspace
    let collaborationWorkspace = await Workspace.findOne({
      createdBy: user._id,
      type: 'collaboration',
    });

    if (!collaborationWorkspace) {
      // Create new collaboration workspace
      collaborationWorkspace = new Workspace({
        name: `${user.name}'s Collaboration Workspace`,
        type: 'collaboration',
        createdBy: user._id,
        members: [{ user: user._id, role: 'owner' }],
        boards: [board._id],
      });
      await collaborationWorkspace.save();
    } else {
      // Update existing workspace
      // Initialize boards array if it doesn't exist
      if (!collaborationWorkspace.boards) {
        collaborationWorkspace.boards = [];
      }

      // Add board if not already present
      const boardExists = collaborationWorkspace.boards.some(
        (existingBoard) => existingBoard.toString() === board._id.toString()
      );

      if (!boardExists) {
        collaborationWorkspace.boards.push(board._id);
        await Workspace.findByIdAndUpdate(
          collaborationWorkspace._id,
          { $addToSet: { boards: board._id } },
          { new: true }
        );
      }
    }

    // 5. Add user to board members if not already a member
    const isMember = board.members.some(
      (m) => m.user.toString() === user._id.toString()
    );

    if (!isMember) {
      board.members.push({
        user: user._id,
        role: invitation.role,
        watchStatus: 'tracking',
        invitedBy: invitation.invitedBy,
      });
    }

    // 6. Remove used invitation
    board.invitations = board.invitations.filter(
      (inv) => inv.token !== hashedToken
    );

    await board.save();

    res.status(200).json({
      status: 'success',
      message: 'Successfully joined board',
      data: {
        board,
        workspace: collaborationWorkspace,
      },
    });
  } catch (error) {
    console.error('Invitation acceptance error:', error);
    return next(
      new AppError(`Error accepting invitation: ${error.message}`, 500)
    );
  }
});

exports.getPendingInvitations = catchAsync(async (req, res, next) => {
  const board = await Board.findById(req.params.id);

  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  // Check permission
  const member = board.members.find(
    (m) => m.user.toString() === req.user._id.toString()
  );

  if (!member || !['admin', 'owner'].includes(member.role)) {
    return next(
      new AppError('Only board admins and owners can view invitations', 403)
    );
  }

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

/**
 * Cancel pending invitation for a board
 * @param {string} req.params.id - Board ID
 * @param {string} req.params.email - Invited email to cancel
 */
exports.cancelInvitation = catchAsync(async (req, res, next) => {
  const board = await Board.findById(req.params.id);
  const { email } = req.params;

  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  // Check if requester has permission
  const requester = board.members.find(
    (m) => m.user.toString() === req.user._id.toString()
  );

  if (!requester || !['admin', 'owner'].includes(requester.role)) {
    return next(
      new AppError('Only board admins and owners can cancel invitations', 403)
    );
  }

  // Remove the invitation
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
  const board = await Board.findById(req.params.id)
    .populate('workspace')
    .populate('members.user');

  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  // Check if requester has permission
  const requester = board.members.find(
    (m) => m.user._id.toString() === req.user._id.toString()
  );

  if (!requester || !['admin', 'owner'].includes(requester.role)) {
    return next(
      new AppError('Only board admins and owners can remove members', 403)
    );
  }

  // Check if target user exists in board
  const targetMember = board.members.find(
    (m) => m.user._id.toString() === req.params.userId
  );

  if (!targetMember) {
    return next(new AppError('Member not found in board', 404));
  }

  // Prevent removing the board owner
  if (targetMember.role === 'owner') {
    return next(new AppError('Cannot remove board owner', 400));
  }

  // If board is in collaboration workspace and removing the only member,
  // the board should be deleted
  if (
    board.workspace.type === 'collaboration' &&
    board.members.length === 1 &&
    board.members[0].user._id.toString() === req.params.userId
  ) {
    await board.remove();
    return res.status(204).json({
      status: 'success',
      message: 'Board deleted as last member was removed',
    });
  }

  // Remove the member
  board.members = board.members.filter(
    (m) => m.user._id.toString() !== req.params.userId
  );

  await board.save();

  res.status(200).json({
    status: 'success',
    message: 'Member removed successfully',
    data: { board },
  });
});

/**
 * Get all boards for the current user
 * Includes boards where user is member and starred boards
 */

exports.getUserBoards = catchAsync(async (req, res, next) => {
  // Get all boards where user is a member
  const userBoards = await Board.find({
    'members.user': req.user._id,
    archived: false,
  })
    .populate({
      path: 'workspace',
      select: 'name type createdBy',
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

  // Organize boards by workspace type
  const organizedBoards = {
    private: [],
    public: [],
    collaboration: [],
    recent: [],
    starred: [],
  };

  // Get 5 most recently updated boards
  const recentBoards = [...userBoards]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5);

  // Organize boards by workspace type
  userBoards.forEach((board) => {
    if (board.starred) {
      organizedBoards.starred.push(board);
    }

    if (board.workspace.type === 'private') {
      organizedBoards.private.push(board);
    } else if (board.workspace.type === 'public') {
      organizedBoards.public.push(board);
    } else if (board.workspace.type === 'collaboration') {
      organizedBoards.collaboration.push(board);
    }
  });

  // Add recent boards
  organizedBoards.recent = recentBoards;

  // Add summary statistics
  const summary = {
    totalBoards: userBoards.length,
    totalStarred: organizedBoards.starred.length,
    boardsByWorkspaceType: {
      private: organizedBoards.private.length,
      public: organizedBoards.public.length,
      collaboration: organizedBoards.collaboration.length,
    },
  };

  res.status(200).json({
    status: 'success',
    data: {
      boards: organizedBoards,
      summary,
    },
  });
});

/**
 * Get boards for a specific workspace
 */
exports.getWorkspaceBoards = catchAsync(async (req, res, next) => {
  const { workspaceId } = req.params;
  const { search, sort = '-updatedAt' } = req.query;

  // Build query
  const query = {
    workspace: workspaceId,
    archived: false,
  };

  // Add search functionality
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  // Get workspace to check permissions
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }

  // Check if user has access to workspace
  const isMember = workspace.members.some(
    (member) => member.user.toString() === req.user._id.toString()
  );

  if (!isMember) {
    return next(new AppError('You do not have access to this workspace', 403));
  }

  // Get boards with populated fields
  const boards = await Board.find(query)
    .populate({
      path: 'members.user',
      select: 'name email username',
    })
    .populate({
      path: 'createdBy',
      select: 'name email username',
    })
    .sort(sort);

  // Calculate statistics
  const stats = {
    total: boards.length,
    starred: boards.filter((board) => board.starred).length,
    byVisibility: {
      private: boards.filter((board) => board.visibility === 'private').length,
      workspace: boards.filter((board) => board.visibility === 'workspace')
        .length,
      public: boards.filter((board) => board.visibility === 'public').length,
    },
  };

  res.status(200).json({
    status: 'success',
    data: {
      workspace: {
        id: workspace._id,
        name: workspace.name,
        type: workspace.type,
      },
      boards,
      stats,
    },
  });
});

/**
 * Get archived boards
 * Can be filtered by workspace if workspaceId is provided in query
 */
exports.getArchivedBoards = catchAsync(async (req, res, next) => {
  const archivedBoards = await Board.find({
    'members.user': req.user._id,
    archived: true,
    archivedBy: req.user._id,
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
    .sort('-archivedAt');

  // Calculate statistics
  const stats = {
    total: archivedBoards.length,
    byWorkspaceType: {
      private: archivedBoards.filter(
        (board) => board.workspace.type === 'private'
      ).length,
      public: archivedBoards.filter(
        (board) => board.workspace.type === 'public'
      ).length,
      collaboration: archivedBoards.filter(
        (board) => board.workspace.type === 'collaboration'
      ).length,
    },
    recentlyArchived: archivedBoards.filter((board) => {
      const daysSinceArchived = Math.floor(
        (Date.now() - board.archivedAt) / (1000 * 60 * 60 * 24)
      );
      return daysSinceArchived <= 30; // Boards archived in last 30 days
    }).length,
  };

  res.status(200).json({
    status: 'success',
    data: {
      boards: archivedBoards,
      stats,
    },
  });
});

/**
 * Archive a board
 */
exports.archiveBoard = catchAsync(async (req, res, next) => {
  const board = await Board.findById(req.params.id);

  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  // Check if user is a member of the board (any role allowed)
  const isMember = board.members.some(
    (member) => member.user.toString() === req.user._id.toString()
  );

  if (!isMember) {
    return next(new AppError('You must be a board member to archive it', 403));
  }

  // Check if board is already archived
  if (board.archived) {
    return next(new AppError('Board is already archived', 400));
  }

  // Archive the board
  board.archived = true;
  board.archivedAt = Date.now();
  board.archivedBy = req.user._id;

  await board.save();

  res.status(200).json({
    status: 'success',
    message: 'Board archived successfully',
    data: { board },
  });
});

/**
 * Restore an archived board
 */
exports.restoreBoard = catchAsync(async (req, res, next) => {
  const board = await Board.findById(req.params.id);

  if (!board) {
    return next(new AppError('Board not found', 404));
  }

  // Check if user is a member of the board (any role allowed)
  const isMember = board.members.some(
    (member) => member.user.toString() === req.user._id.toString()
  );

  if (!isMember) {
    return next(new AppError('You must be a board member to restore it', 403));
  }

  // Check if board is not archived
  if (!board.archived) {
    return next(new AppError('Board is not archived', 400));
  }

  // Restore the board
  board.archived = false;
  board.archivedAt = undefined;
  board.archivedBy = undefined;

  await board.save();

  res.status(200).json({
    status: 'success',
    message: 'Board restored successfully',
    data: { board },
  });
});

/**
 * Delete an archived board permanently
 */
// exports.deleteArchivedBoard = catchAsync(async (req, res, next) => {
//   const board = await Board.findById(req.params.id);

//   if (!board) {
//     return next(new AppError('Board not found', 404));
//   }

//   // Check if user has permission to delete
//   const member = board.members.find(
//     (m) => m.user.toString() === req.user._id.toString()
//   );

//   if (!member || !['owner', 'admin'].includes(member.role)) {
//     return next(
//       new AppError(
//         'Only board owners and admins can permanently delete boards',
//         403
//       )
//     );
//   }

//   // Check if board is archived
//   if (!board.archived) {
//     return next(
//       new AppError('Board must be archived before permanent deletion', 400)
//     );
//   }

//   // Delete the board
//   await Board.deleteOne({ _id: board._id });
//   res.status(204).json({
//     status: 'success',
//     data: null,
//   });
// });

// Delete a board permanently
exports.deleteBoard = catchAsync(async (req, res, next) => {
  // Find board and populate workspace to check its type
  const board = await Board.findById(req.params.id).populate({
    path: 'workspace',
    select: 'type createdBy',
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

  // Start a session for transaction
  const session = await Board.startSession();

  try {
    await session.withTransaction(async () => {
      // If board is in public workspace, delete all related collaboration boards
      if (board.workspace.type === 'public') {
        await Board.deleteMany(
          {
            originalBoard: board._id,
            'workspace.type': 'collaboration',
          },
          { session }
        );
      }

      // Delete the main board
      await Board.deleteOne({ _id: board._id }, { session });
    });

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    await session.abortTransaction();
    return next(new AppError('Error deleting board', 500));
  } finally {
    await session.endSession();
  }
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

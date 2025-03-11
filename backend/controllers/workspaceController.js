const Workspace = require('../models/workspaceModel.js');
const AppError = require('../utils/appError.js');
const catchAsync = require('../utils/catchAsync.js');
const User = require('../models/userModel');
const sendEmail = require('../utils/email');
const crypto = require('crypto');
const Board = require('../models/boardModel');

// Helper function for essential workspace population
const populateWorkspace = async (workspaceId) => {
  return await Workspace.findById(workspaceId)
    .populate({
      path: 'members.user',
      select: 'username email avatar', // Only essential user info
    })
    .populate({
      path: 'createdBy',
      select: 'username email', // Basic creator info
    })
    .populate({
      path: 'boards',
      select: 'name description', // Basic board info
      match: { archived: false }, // Only non-archived boards
    });
};

// Helper function to format member data
const formatMemberData = (member) => ({
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
});

// Middleware for checking workspace permissions
exports.checkWorkspacePermission = (permission) => {
  return catchAsync(async (req, res, next) => {
    const workspace = await Workspace.findById(req.params.workspaceId);

    if (!workspace) {
      return next(new AppError('Workspace not found', 404));
    }

    // Check if user has access to workspace
    const member = workspace.members.find((member) =>
      member.user.equals(req.user._id)
    );

    if (!member) {
      return next(
        new AppError('You do not have access to this workspace', 403)
      );
    }

    // Special validations for workspace types
    if (
      (workspace.type === 'private' || workspace.type === 'collaboration') &&
      !workspace.createdBy.equals(req.user._id)
    ) {
      return next(new AppError('You cannot modify this workspace', 403));
    }

    if (!workspace.hasPermission(req.user._id, permission)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    // Attach workspace and user role to request
    req.workspace = workspace;
    req.userRole = member.role;
    next();
  });
};

// Middleware to check if workspace is public
exports.checkPublicWorkspace = catchAsync(async (req, res, next) => {
  if (req.workspace.type !== 'public') {
    return next(
      new AppError('This action is only allowed for team workspaces', 400)
    );
  }
  next();
});

exports.getPublicAndMemberWorkspaces = catchAsync(async (req, res, next) => {
  const workspaces = await Workspace.find({
    $and: [
      { 'members.user': req.user._id }, // User must be a member
      { type: { $ne: 'private' } }, // Not private type
      { type: { $ne: 'collaboration' } }, // Not collaboration type
    ],
  })
    // .populate('members.user')
    .populate('boards', '_id')
    .sort({ createdAt: -1 });

  // Transform workspace data
  const transformedWorkspaces = workspaces.map((workspace) => {
    const userMembership = workspace.members.find(
      (member) =>
        member.user && member.user._id && member.user._id.equals(req.user._id)
    );

    return {
      _id: workspace._id,
      name: workspace.name,
      description: workspace.description,
      type: workspace.type,
      createdBy: workspace.createdBy,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      settings: workspace.settings,
      boards: workspace.boards,
      memberCount: workspace.members.length,
      userRole: userMembership ? userMembership.role : null,
      // isMember: !!userMembership,
      // members: workspace.members,
    };
  });

  res.status(200).json({
    status: 'success',
    data: {
      workspaces: transformedWorkspaces,
    },
  });
});

exports.createWorkspace = catchAsync(async (req, res, next) => {
  const workspace = await Workspace.create({
    ...req.body,
    createdBy: req.user._id,
    members: [{ user: req.user._id, role: 'owner' }],
  });

  res.status(201).json({
    status: 'success',
    data: { workspace },
  });
});

// Get user's workspaces
exports.getUserWorkspaces = catchAsync(async (req, res, next) => {
  // Get workspaces where user is the creator
  const ownedWorkspaces = await Workspace.find({
    createdBy: req.user._id,
  }).populate('boards', '_id');

  // Get workspaces where user is a member but not creator
  const memberWorkspaces = await Workspace.find({
    'members.user': req.user._id,
    createdBy: { $ne: req.user._id },
    type: 'public',
  }).populate('boards', '_id');

  // Get all board IDs from public and private workspaces
  const existingBoardIds = [
    ...ownedWorkspaces.filter((w) => w.type !== 'collaboration'),
    ...memberWorkspaces,
  ].reduce((acc, workspace) => {
    return [
      ...acc,
      ...(workspace.boards || []).map((board) => board._id.toString()),
    ];
  }, []);

  // For collaboration workspace, get only board IDs where user is a member AND board is not in other workspaces
  const collaborationWorkspace = ownedWorkspaces.find(
    (w) => w.type === 'collaboration'
  );
  if (collaborationWorkspace) {
    const sharedBoardIds = await Board.find({
      'members.user': req.user._id,
      workspace: { $ne: collaborationWorkspace._id },
      _id: { $nin: existingBoardIds },
      archived: false,
    }).select('_id');

    collaborationWorkspace.boards = sharedBoardIds.map((board) => board._id);
  }

  // Ensure user has all default workspace types
  const userDefaultWorkspaces = ownedWorkspaces.filter((w) =>
    ['private', 'public', 'collaboration'].includes(w.type)
  );

  if (userDefaultWorkspaces.length < 3) {
    const existingTypes = userDefaultWorkspaces.map((w) => w.type);
    const missingTypes = ['private', 'public', 'collaboration'].filter(
      (type) => !existingTypes.includes(type)
    );

    for (const type of missingTypes) {
      const workspace = await Workspace.create({
        name:
          type === 'public'
            ? `${req.user.username}'s workspace`
            : `${type.charAt(0).toUpperCase() + type.slice(1)} Workspace`,
        description:
          type === 'private'
            ? 'Your private workspace'
            : type === 'public'
            ? 'Share and collaborate with your team'
            : 'Access boards shared by others',
        type,
        createdBy: req.user._id,
        members: [{ user: req.user._id, role: 'owner' }],
      });
      ownedWorkspaces.push(workspace);
    }
  }

  res.status(200).json({
    status: 'success',
    data: {
      ownedWorkspaces,
      memberWorkspaces,
    },
  });
});

// Get specific workspace by ID
exports.getWorkspaceById = catchAsync(async (req, res, next) => {
  const workspace = await Workspace.findById(req.params.workspaceId);

  // Check if workspace exists
  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }

  // Send response
  res.status(200).json({
    status: 'success',
    data: { workspace },
  });
});

// Update workspace details (only for public workspace)
exports.updateWorkspace = catchAsync(async (req, res, next) => {
  const workspace = req.workspace;
  const { settings, memberUpdates } = req.body;
  const userRole = workspace.getMemberRole(req.user._id);

  let updateData = {};
  let memberUpdateResults = [];

  // Handle Settings Updates
  if (settings) {
    // Critical settings (owner only)
    if (settings.inviteRestriction || settings.boardCreation) {
      if (userRole !== 'owner') {
        return next(
          new AppError('Only workspace owner can modify critical settings', 403)
        );
      }
    }

    // General settings (owner & admin)
    if (
      settings.defaultView ||
      settings.cardCoverEnabled ||
      settings.notificationsEnabled ||
      settings.maxBoardsPerWorkspace
    ) {
      if (!workspace.isOwnerOrAdmin(req.user._id)) {
        return next(
          new AppError(
            'Only workspace owners and admins can modify general settings',
            403
          )
        );
      }
    }

    updateData.settings = { ...workspace.settings, ...settings };
  }

  // Handle Member Role Updates
  if (memberUpdates) {
    if (!Array.isArray(memberUpdates)) {
      return next(new AppError('memberUpdates must be an array', 400));
    }

    for (const update of memberUpdates) {
      const { userId, role } = update;

      if (!['admin', 'member'].includes(role)) {
        memberUpdateResults.push({
          userId,
          success: false,
          message: 'Invalid role. Role must be either admin or member',
        });
        continue;
      }

      const targetMember = workspace.members.find(
        (member) => member.user.toString() === userId
      );

      if (!targetMember) {
        memberUpdateResults.push({
          userId,
          success: false,
          message: 'Member not found',
        });
        continue;
      }

      if (targetMember.role === 'owner') {
        memberUpdateResults.push({
          userId,
          success: false,
          message: "Cannot change workspace owner's role",
        });
        continue;
      }

      if (role === 'admin' && userRole !== 'owner') {
        memberUpdateResults.push({
          userId,
          success: false,
          message: 'Only workspace owner can promote to admin',
        });
        continue;
      }

      // Update member's role and permissions
      targetMember.role = role;
      targetMember.permissions =
        role === 'admin'
          ? [
              'create_boards',
              'delete_own_boards',
              'invite_members',
              'view_members',
              'manage_settings',
            ]
          : ['view_workspace', 'view_own_boards'];

      memberUpdateResults.push({
        userId,
        success: true,
        role,
        permissions: targetMember.permissions,
      });
    }
  }

  // Save all updates
  if (Object.keys(updateData).length > 0 || memberUpdateResults.length > 0) {
    if (Object.keys(updateData).length > 0) {
      workspace.set(updateData);
    }
    await workspace.save();
  }

  // Get populated workspace after updates
  const populatedWorkspace = await populateWorkspace(workspace._id);

  res.status(200).json({
    status: 'success',
    data: {
      workspace: {
        _id: populatedWorkspace._id,
        name: populatedWorkspace.name,
        type: populatedWorkspace.type,
        settings: populatedWorkspace.settings,
        members: populatedWorkspace.members.map(formatMemberData),
        boards: populatedWorkspace.boards,
        createdBy: {
          _id: populatedWorkspace.createdBy._id,
          username: populatedWorkspace.createdBy.username,
        },
      },
    },
  });
});

// Remove member from public workspace
exports.removeMember = catchAsync(async (req, res, next) => {
  const workspace = req.workspace;

  // Verify this is a public workspace
  if (workspace.type !== 'public') {
    return next(
      new AppError('Members can only be removed from team workspace', 400)
    );
  }

  // Prevent removing the workspace owner
  const isOwner = workspace.members.some(
    (member) => member.user.equals(req.params.userId) && member.role === 'owner'
  );

  if (isOwner) {
    return next(new AppError('Cannot remove workspace owner', 400));
  }

  // Remove member
  workspace.members = workspace.members.filter(
    (member) => !member.user.equals(req.params.userId)
  );

  await workspace.save();

  res.status(200).json({
    status: 'success',
    data: { workspace },
  });
});

// Get members of a public workspace only
exports.getWorkspaceMembers = catchAsync(async (req, res, next) => {
  const workspace = await Workspace.findById(req.workspace._id)
    .populate('members.user', 'username email avatar')
    .select('members');

  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }

  const members = workspace.members.map(formatMemberData);

  // Add useful stats
  const memberStats = {
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
      stats: memberStats,
    },
  });
});

/**
 * Invite multiple members to a workspace
 * @param {string} req.params.workspaceId - Workspace ID
 * @param {Array} req.body.invites - Array of {email, role} objects
 */
exports.inviteMembers = catchAsync(async (req, res, next) => {
  const workspace = req.workspace;

  if (workspace.type !== 'public') {
    return next(
      new AppError('Members can only be invited to team workspace', 400)
    );
  }

  // Check if user has permission to invite
  if (!workspace.hasPermission(req.user._id, 'invite_members')) {
    return next(
      new AppError('You do not have permission to invite members', 403)
    );
  }

  // Check invite restriction setting
  const userRole = workspace.getMemberRole(req.user._id);
  if (
    workspace.settings.inviteRestriction === 'owner' &&
    userRole !== 'owner'
  ) {
    return next(new AppError('Only workspace owner can send invitations', 403));
  }

  // Get workspace owner
  const workspaceOwner = workspace.members.find(
    (member) => member.role === 'owner'
  );
  if (!workspaceOwner) {
    return next(new AppError('Workspace owner not found', 404));
  }
  const workspaceOwnerUser = await User.findById(workspaceOwner.user);

  const { invites } = req.body;
  if (!Array.isArray(invites)) {
    return next(new AppError('Invites must be an array', 400));
  }

  const invitationResults = [];
  const failedInvites = [];

  for (const invite of invites) {
    const { email, role = 'member' } = invite;

    // Only owners can invite admins
    if (role === 'admin' && userRole !== 'owner') {
      failedInvites.push({ email, reason: 'Only owners can invite admins' });
      continue;
    }

    // Check if user exists and is already a member
    const user = await User.findOne({ email });
    if (
      user &&
      workspace.members.some((member) => member.user.equals(user._id))
    ) {
      failedInvites.push({ email, reason: 'Already a member' });
      continue;
    }

    // Check for existing pending invitation
    const existingInvitation = workspace.invitations.find(
      (inv) => inv.email === email && inv.status === 'pending'
    );
    if (existingInvitation) {
      failedInvites.push({ email, reason: 'Invitation already sent' });
      continue;
    }

    // Create invitation token
    const inviteToken = workspace.createInvitationToken(
      email,
      role,
      req.user._id
    );

    // Generate the proper invitation URL using BASE_URL
    const inviteUrl = `${process.env.BASE_URL}/workspaces/join/${inviteToken}`;

    try {
      // Send email using consistent styling with auth emails
      const message = `
       <div style="background-color: #f6f9fc; padding: 20px; font-family: Arial, sans-serif;">
         <div style="background-color: white; padding: 20px; border-radius: 10px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
           <h2 style="color: #EFC235; text-align: center; font-size: 24px; margin-bottom: 20px;">Workspace Invitation</h2>
           <p style="color: #3a2d34; text-align: center; font-size: 16px;">You've been invited to join "${workspace.name}" workspace.</p>
           <p style="color: #3a2d34; text-align: center; font-size: 14px;">Role: ${role}</p>
           <div style="text-align: center; margin: 30px 0;">
             <a href="${inviteUrl}" 
                style="background-color: #EFC235; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
               Accept Invitation
             </a>
           </div>
           <p style="color: #3a2d34; font-size: 14px; text-align: center; margin-bottom: 20px;">This invitation expires in 7 days.</p>
           <hr style="border: none; border-top: 1px solid #e6e6e6; margin: 20px 0;">
           <p style="color: #888; font-size: 12px; text-align: center;">If you didn't expect this invitation, you can safely ignore this email.</p>
         </div>
       </div>
     `;

      await sendEmail({
        email,
        subject: `Invitation to join ${workspaceOwnerUser.username}'s ${workspace.name} workspace`,
        message,
      });
      invitationResults.push({ email, status: 'sent' });
    } catch (error) {
      failedInvites.push({ email, reason: error.message });
      // Remove failed invitation
      workspace.invitations = workspace.invitations.filter(
        (inv) => inv.email !== email
      );
    }
  }

  await workspace.save();

  res.status(200).json({
    status: 'success',
    data: {
      successful: invitationResults,
      failed: failedInvites,
    },
  });
});

/**
 * Accept workspace invitation
 * @param {string} req.params.token - Invitation token
 */
exports.acceptInvitation = catchAsync(async (req, res, next) => {
  const { token } = req.params;

  // Verify invitation
  const workspace = await Workspace.verifyInvitationToken(token);

  if (!workspace) {
    return next(new AppError('Invalid or expired invitation', 400));
  }

  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // Find the invitation
  const invitation = workspace.invitations.find(
    (inv) => inv.status === 'pending' && inv.token === hashedToken
  );

  if (!invitation) {
    return next(new AppError('Invalid or expired invitation', 400));
  }

  // Find user
  let user = await User.findOne({ email: invitation.email });

  // Check if user is already a member
  const isAlreadyMember = workspace.members.some((member) =>
    member.user.equals(user._id)
  );

  if (!isAlreadyMember) {
    // Add user to workspace members
    workspace.members.push({
      user: user._id,
      role: invitation.role,
    });
  }

  // Remove the invitation after it has been accepted
  workspace.invitations = workspace.invitations.filter(
    (inv) => inv.token !== hashedToken
  );

  await workspace.save();

  res.status(200).json({
    status: 'success',
    message: 'Successfully joined workspace',
    data: { workspace },
  });
});

/**
 * Get pending invitations for a workspace
 * @param {string} req.params.workspaceId - Workspace ID
 */
exports.getPendingInvitations = catchAsync(async (req, res, next) => {
  const workspace = req.workspace;

  if (workspace.type !== 'public') {
    return next(
      new AppError('Can only view invitations for team workspace', 400)
    );
  }

  // Clean up expired invitations and return only pending ones
  workspace.invitations = workspace.invitations.filter(
    (inv) => inv.tokenExpiresAt > Date.now() && inv.status === 'pending'
  );

  res.status(200).json({
    status: 'success',
    data: {
      invitations: workspace.invitations,
    },
  });
});

/**
 * Cancel pending invitation
 * @param {string} req.params.workspaceId - Workspace ID
 * @param {string} req.params.email - Invited email to cancel
 */
exports.cancelInvitation = catchAsync(async (req, res, next) => {
  const workspace = req.workspace;
  const { email } = req.params;

  if (workspace.type !== 'public') {
    return next(
      new AppError('Can only manage invitations for team workspace', 400)
    );
  }

  workspace.invitations = workspace.invitations.filter(
    (inv) => inv.email !== email
  );
  await workspace.save();

  res.status(200).json({
    status: 'success',
    message: 'Invitation cancelled',
  });
});

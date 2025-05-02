const Workspace = require('../models/workspaceModel.js');
const AppError = require('../utils/appError.js');
const catchAsync = require('../utils/catchAsync.js');
const User = require('../models/userModel');
const sendEmail = require('../utils/email');
const crypto = require('crypto');
const Board = require('../models/boardModel');
const permissionService = require('../utils/permissionService');
const activityService = require('../utils/activityService');
const invitationService = require('../utils/invitationService');

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

// // Helper function to get workspace and verify access
// const getWorkspace = async (workspaceId, userId) => {
//   const workspace = await Workspace.findById(workspaceId);

//   if (!workspace) {
//     throw new AppError('Workspace not found', 404);
//   }

//   // Verify user is a workspace member
//   const isMember = workspace.members.some(
//     (member) => member.user.toString() === userId.toString()
//   );

//   if (!isMember) {
//     throw new AppError(
//       'You must be a workspace member to access this workspace',
//       403
//     );
//   }

//   return workspace;
// };

// Middleware for checking workspace permissions with optional population
exports.checkWorkspacePermission = (permission, populateOptions = null) => {
  return catchAsync(async (req, res, next) => {
    let query = Workspace.findById(req.params.workspaceId);

    // Apply population if specified
    if (populateOptions) {
      query = query.populate(populateOptions);
    }

    const workspace = await query;

    if (!workspace) {
      return next(new AppError('Workspace not found', 404));
    }
    try {
      // Use permissionService to verify workspace permission
      permissionService.verifyWorkspacePermission(
        workspace,
        req.user._id,
        permission
      );

      // Attach workspace to request for later use
      req.workspace = workspace;
      next();
    } catch (error) {
      return next(error);
    }
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
  // Build query
  const query = {
    $and: [
      { 'members.user': req.user._id },
      { type: { $ne: 'private' } },
      { type: { $ne: 'collaboration' } },
    ],
  };

  // Get total count
  const total = await Workspace.countDocuments(query);
  const workspaces = await Workspace.find(query);

  // Transform data
  const transformedWorkspaces = workspaces.map((workspace) => {
    // Find the current user's role in this workspace
    const userMember = workspace.members.find(
      (member) => member.user.toString() === req.user._id.toString()
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
      memberCount: workspace.members.length,
      userRole: userMember ? userMember.role : null,
    };
  });

  res.status(200).json({
    status: 'success',
    total,

    data: { workspaces: transformedWorkspaces },
  });
});

exports.createWorkspace = catchAsync(async (req, res, next) => {
  const workspace = await Workspace.create({
    ...req.body,
    createdBy: req.user._id,
    members: [{ user: req.user._id, role: 'owner' }],
  });

  // Log activity
  await activityService.logWorkspaceActivity(
    workspace,
    req.user._id,
    'workspace_created',
    {
      name: workspace.name,
      type: workspace.type,
    }
  );

  res.status(201).json({
    status: 'success',
    data: { workspace },
  });
});

// Get user's workspaces
exports.getUserWorkspaces = catchAsync(async (req, res, next) => {
  // Set cache control headers to prevent caching
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'Last-Modified': new Date().toUTCString(),
  });

  // Get workspaces where user is the creator
  const ownedWorkspaces = await Workspace.find({ createdBy: req.user._id });

  // Ensure user has all default workspace types
  const userDefaultWorkspaces = ownedWorkspaces.filter((w) =>
    ['private', 'public', 'collaboration'].includes(w.type)
  );
  console.log(userDefaultWorkspaces.length);

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

      // Log activity for each new workspace
      await activityService.logWorkspaceActivity(
        workspace,
        req.user._id,
        'workspace_created',
        {
          name: workspace.name,
          type: workspace.type,
          auto_created: true,
        }
      );

      ownedWorkspaces.push(workspace);
    }
  }

  // Add timestamp to response to prevent caching
  res.status(200).json({
    status: 'success',
    result: ownedWorkspaces.length,
    timestamp: Date.now(),
    data: {
      ownedWorkspaces,
    },
  });
});

// Get specific workspace by ID
exports.getWorkspaceById = catchAsync(async (req, res, next) => {
  // Send response
  res.status(200).json({
    status: 'success',
    data: { workspace: req.workspace },
  });
});

// Update workspace details (only for public workspace)
exports.updateWorkspace = catchAsync(async (req, res, next) => {
  const workspace = req.workspace;
  const userRole = workspace.getMemberRole(req.user._id);
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
    updateData.settings = { ...workspace.settings };

    // Critical settings (owner only)
    if (settings.inviteRestriction || settings.boardCreation) {
      if (userRole !== 'owner') {
        return next(
          new AppError('Only workspace owner can modify critical settings', 403)
        );
      }

      if (settings.inviteRestriction)
        updateData.settings.inviteRestriction = settings.inviteRestriction;
      if (settings.boardCreation)
        updateData.settings.boardCreation = settings.boardCreation;
    }

    // General settings (owner & admin)
    const generalSettings = ['defaultView', 'notificationsEnabled'];
    if (generalSettings.some((field) => settings[field] !== undefined)) {
      permissionService.verifyWorkspacePermission(
        workspace,
        req.user._id,
        'manage_settings'
      );

      generalSettings.forEach((field) => {
        if (settings[field] !== undefined) {
          updateData.settings[field] = settings[field];
        }
      });
    }
  }

  // Log activities for basic fields and settings
  if (Object.keys(updateData).length > 0) {
    if (settings) {
      await activityService.logWorkspaceActivity(
        workspace,
        req.user._id,
        'workspace_settings_updated',
        {
          updatedFields: Object.keys(settings),
        }
      );
    }

    if (Object.keys(basicFields).length > 0) {
      await activityService.logWorkspaceActivity(
        workspace,
        req.user._id,
        'workspace_updated',
        {
          updatedFields: Object.keys(basicFields),
        }
      );
    }
  }

  // Handle Member Role Updates
  if (members && Array.isArray(members)) {
    for (const update of members) {
      const { user: userId, role } = update;

      if (!['admin', 'member'].includes(role)) {
        return next(new AppError('Invalid role. Must be admin or member', 400));
      }

      const targetMember = workspace.members.find(
        (m) => m.user.toString() === userId
      );
      if (!targetMember) {
        return next(new AppError('Member not found', 404));
      }

      if (targetMember.role === 'owner') {
        return next(new AppError("Cannot change workspace owner's role", 400));
      }

      const currentUserRole = workspace.getMemberRole(req.user._id);
      // Save the previous role before any changes
      const previousRole = targetMember.role;

      // Handle promotion to admin (only owner can do this)
      if (role === 'admin' && previousRole === 'member') {
        if (currentUserRole !== 'owner') {
          return next(
            new AppError('Only workspace owner can promote to admin', 403)
          );
        }
      }

      // Handle demotion from admin (only owner can do this)
      if (role === 'member' && previousRole === 'admin') {
        if (currentUserRole !== 'owner') {
          return next(
            new AppError('Only workspace owner can demote an admin', 403)
          );
        }
      }

      // Calculate new permissions based on the role
      let newPermissions;
      switch (role) {
        case 'admin':
          newPermissions = [
            'manage_members',
            'create_boards',
            'delete_own_boards',
            'invite_members',
            'view_members',
            'manage_settings',
          ];
          break;
        case 'member':
          newPermissions = [
            'view_workspace',
            'view_own_boards',
            'view_members',
          ];
          break;
        default:
          newPermissions = targetMember.permissions;
      }

      // Use update operator for member updates
      await Workspace.updateOne(
        { _id: workspace._id, 'members.user': userId },
        {
          $set: {
            'members.$.role': role,
            'members.$.permissions': newPermissions,
          },
        }
      );

      // Use previously saved role in the activity log
      await activityService.logWorkspaceActivity(
        workspace,
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

  // Update workspace with basic fields and settings
  if (Object.keys(updateData).length > 0) {
    await Workspace.updateOne({ _id: workspace._id }, { $set: updateData });
  }

  // ALWAYS get the latest workspace data after any updates
  const UpdatedWorkspace = await Workspace.findById(workspace._id);

  res.status(200).json({
    status: 'success',
    data: {
      workspace: UpdatedWorkspace,
    },
  });
});

// Remove member from public workspace
exports.removeMember = catchAsync(async (req, res, next) => {
  const workspace = req.workspace;
  const targetUserId = req.params.userId;

  // Get the target member's role
  const targetMemberRole = workspace.getMemberRole(targetUserId);

  if (!targetMemberRole) {
    return next(new AppError('Member not found', 404));
  }

  // Prevent removing the workspace owner
  if (targetMemberRole === 'owner') {
    return next(new AppError('Cannot remove workspace owner', 400));
  }

  // Admin can only remove regular members, not other admins
  const currentUserRole = workspace.getMemberRole(req.user._id);
  if (currentUserRole === 'admin' && targetMemberRole === 'admin') {
    return next(new AppError('Admins cannot remove other admins', 403));
  }

  // Store member info for activity log
  const memberInfo = {
    user: targetUserId,
    role: targetMemberRole,
  };

  // Remove member
  workspace.members = workspace.members.filter(
    (member) => !member.user.equals(targetUserId)
  );

  // Log activity
  await activityService.logWorkspaceActivity(
    workspace,
    req.user._id,
    'member_removed',
    {
      member: memberInfo,
      removedBy: req.user._id,
    }
  );
  await workspace.save();

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Get members of a public workspace only
exports.getWorkspaceMembers = catchAsync(async (req, res, next) => {
  const workspace = req.workspace;

  // Get query parameters
  const { page = 1, limit = 10, sort = 'joinedAt' } = req.query;
  const parsedPage = Math.max(parseInt(page), 1);
  const parsedLimit = Math.min(parseInt(limit), 100);
  const sortOrder = sort.startsWith('-') ? -1 : 1;
  const sortField = sort.replace(/^-/, '');

  // Clone members array to avoid mutating original
  let members = [...workspace.members];

  // Validate sort field
  const validSortFields = ['joinedAt', 'role'];
  if (!validSortFields.includes(sortField)) {
    return next(new AppError('Invalid sort field', 400));
  }

  // Sort members
  members.sort((a, b) => {
    if (sortField === 'joinedAt') {
      return sortOrder * (new Date(a[sortField]) - new Date(b[sortField]));
    }
    if (sortField === 'role') {
      const roleOrder = { owner: 1, admin: 2, member: 3 };
      return sortOrder * (roleOrder[a.role] - roleOrder[b.role]);
    }
    return 0;
  });

  // Pagination calculations
  const total = members.length;
  const startIndex = (parsedPage - 1) * parsedLimit;
  const endIndex = parsedPage * parsedLimit;
  const paginatedMembers = members.slice(startIndex, endIndex);

  // Format data after pagination
  const formattedMembers = paginatedMembers.map(formatMemberData);

  // Stats calculation (from original full list)
  const memberStats = {
    total,
    byRole: {
      owner: members.filter((m) => m.role === 'owner').length,
      admin: members.filter((m) => m.role === 'admin').length,
      member: members.filter((m) => m.role === 'member').length,
    },
  };

  res.status(200).json({
    status: 'success',
    pagination: {
      currentPage: parsedPage,
      totalPages: Math.ceil(total / parsedLimit),
      itemsPerPage: parsedLimit,
      totalItems: total,
    },
    data: {
      members: formattedMembers,
      stats: memberStats,
    },
  });
});

// Invite multiple members to a workspace
exports.inviteMembers = catchAsync(
  // Main function
  async (req, res, next) => {
    const workspace = req.workspace;
    const userRole = workspace.getMemberRole(req.user._id);

    // Check invite restriction setting
    if (
      workspace.settings.inviteRestriction === 'owner' &&
      userRole !== 'owner'
    ) {
      return next(
        new AppError('Only workspace owner can send invitations', 403)
      );
    }

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

      if (workspace.members.some((member) => member.user.equals(user._id))) {
        return next(
          new AppError(
            `User with email ${email} is already a workspace member`,
            400
          )
        );
      }

      // Check for existing pending invitation
      const existingInvitation = workspace.invitations.find(
        (inv) => inv.email === email && inv.status === 'pending'
      );
      if (existingInvitation) {
        return next(new AppError(`Invitation already sent to ${email}`, 400));
      }
    }

    // Store original invitations state for potential rollback
    req.originalInvitations = [...workspace.invitations];
    req.workspaceId = workspace._id;

    // Process bulk invitations
    const invitationResults = await invitationService.processBulkInvitations(
      workspace,
      invitesArray,
      req.user._id,
      'workspace',
      process.env.BASE_URL
    );

    // Log activity for each successful invitation
    for (const invitation of invitationResults) {
      await activityService.logWorkspaceActivity(
        workspace,
        req.user._id,
        'invitation_sent',
        {
          email: invitation.email,
          role: invitation.role,
        }
      );
    }

    // Save the workspace with the new invitations
    await workspace.save();

    res.status(200).json({
      status: 'success',
      message: `Successfully sent ${invitationResults.length} invitation(s)`,
      data: {
        invitationResults,
      },
    });
  },
  // Cleanup function
  async (req, err) => {
    if (req.workspaceId && req.originalInvitations) {
      console.log(
        `Restoring original invitations for workspace ${req.workspaceId}`
      );

      // Restore original invitations state
      await Workspace.findByIdAndUpdate(req.workspaceId, {
        invitations: req.originalInvitations,
      });
    }
  }
);

// Accept workspace invitation
exports.acceptInvitation = catchAsync(
  // Main function
  async (req, res, next) => {
    const { token } = req.params;

    // Hash token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find workspace by token
    const workspace = await Workspace.findOne({
      invitations: {
        $elemMatch: {
          token: hashedToken,
          status: 'pending',
          tokenExpiresAt: { $gt: Date.now() },
        },
      },
    });

    if (!workspace) {
      return next(new AppError('Invalid or expired invitation', 400));
    }

    // Verify token
    const invitation = invitationService.verifyInvitationToken(
      workspace,
      token
    );

    if (!invitation) {
      return next(new AppError('Invalid or expired invitation', 400));
    }

    // Find user
    let user = await User.findOne({ email: invitation.email });
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Store state for potential rollback
    req.invitationAcceptance = {
      workspaceId: workspace._id,
      originalMembers: [...workspace.members],
      originalInvitations: [...workspace.invitations],
      userId: user._id,
      invitationToken: hashedToken,
    };

    // Accept invitation
    await invitationService.acceptInvitation(workspace, invitation, user, {
      entityType: 'workspace',
    });

    // Log activity
    await activityService.logWorkspaceActivity(
      workspace,
      invitation.invitedBy,
      'member_added',
      {
        user: user._id,
        role: invitation.role,
        invited: true,
      }
    );

    res.status(200).json({
      status: 'success',
      message: 'Successfully joined workspace',
      data: {
        workspace,
      },
    });
  },
  // Cleanup function
  async (req, err) => {
    if (req.invitationAcceptance) {
      console.log(
        `Reverting invitation acceptance for workspace ${req.invitationAcceptance.workspaceId}`
      );

      // Restore original members and invitations
      await Workspace.findByIdAndUpdate(req.invitationAcceptance.workspaceId, {
        members: req.invitationAcceptance.originalMembers,
        invitations: req.invitationAcceptance.originalInvitations,
      });
    }
  }
);

// Get pending invitations for a workspace
exports.getPendingInvitations = catchAsync(async (req, res, next) => {
  const workspace = req.workspace;
  const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

  // Parse and validate inputs
  const parsedPage = Math.max(parseInt(page), 1);
  const parsedLimit = Math.min(parseInt(limit), 100);
  const sortOrder = sort.startsWith('-') ? -1 : 1;
  const sortField = sort.replace(/^-/, '');

  // Clean up expired invitations
  invitationService.cleanExpiredInvitations(workspace);

  // Get filtered and sorted invitations
  let pendingInvitations = workspace.invitations.filter(
    (inv) => inv.status === 'pending' && inv.tokenExpiresAt > Date.now()
  );

  // Validate sort field
  const validSortFields = ['createdAt', 'tokenExpiresAt', 'email'];
  if (!validSortFields.includes(sortField)) {
    return next(
      new AppError(
        'Invalid sort field. Valid fields: createdAt, tokenExpiresAt, email',
        400
      )
    );
  }

  // Sort invitations
  pendingInvitations.sort((a, b) => {
    if (sortField === 'email') {
      return sortOrder * a.email.localeCompare(b.email);
    }
    return sortOrder * (new Date(a[sortField]) - new Date(b[sortField]));
  });

  // Pagination
  const total = pendingInvitations.length;
  const startIndex = (parsedPage - 1) * parsedLimit;
  const endIndex = parsedPage * parsedLimit;
  const paginatedInvitations = pendingInvitations.slice(startIndex, endIndex);

  // Format response
  const formattedInvitations = paginatedInvitations.map((inv) => ({
    email: inv.email,
    role: inv.role,
    status: inv.status,
    createdAt: inv.createdAt,
    expiresAt: inv.tokenExpiresAt,
    invitedBy: inv.invitedBy,
  }));

  res.status(200).json({
    status: 'success',
    pagination: {
      currentPage: parsedPage,
      totalPages: Math.ceil(total / parsedLimit),
      itemsPerPage: parsedLimit,
      totalItems: total,
    },
    data: {
      invitations: formattedInvitations,
    },
  });
});

// Cancel pending invitation
exports.cancelInvitation = catchAsync(async (req, res, next) => {
  const workspace = req.workspace;
  const { email } = req.params;

  // Find invitation to be cancelled
  const invitation = workspace.invitations.find(
    (inv) => inv.email === email && inv.status === 'pending'
  );

  if (invitation) {
    // Use invitationService to cancel invitation
    const cancelled = invitationService.cancelInvitation(workspace, email);

    if (cancelled) {
      // Log activity
      await activityService.logWorkspaceActivity(
        workspace,
        req.user._id,
        'invitation_cancelled',
        {
          email,
          role: invitation.role,
        }
      );

      await workspace.save();
    }
  }

  res.status(200).json({
    status: 'success',
    message: 'Invitation cancelled',
  });
});

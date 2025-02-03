const Workspace = require('../models/workspaceModel.js');
const AppError = require('../utils/appError.js');
const catchAsync = require('../utils/catchAsync.js');
const User = require('../models/userModel');
const sendEmail = require('../utils/email');

exports.createWorkspace = catchAsync(async (req, res, next) => {
  const workspace = await Workspace.create({
    ...req.body,
    createdBy: req.user._id,
    members: [{ userId: req.user._id, role: 'owner' }],
  });

  res.status(201).json({
    status: 'success',
    data: { workspace },
  });
});

// Get user's workspaces (one of each type: private, public, collaboration)
exports.getUserWorkspaces = catchAsync(async (req, res, next) => {
  // First get your own default workspaces
  const ownWorkspaces = await Workspace.find({
    createdBy: req.user._id,
  })
    .populate('members.userId', 'fullName username email avatar')
    .populate('createdBy', 'fullName username email');

  // Then get workspaces where you're a member (but not the creator)
  const memberWorkspaces = await Workspace.find({
    'members.userId': req.user._id,
    createdBy: { $ne: req.user._id }, // Not created by you
    type: 'public', // Only public workspaces
  })
    .populate('members.userId', 'fullName username email avatar')
    .populate('createdBy', 'fullName username email');

  // Check if user has all default workspaces
  const existingTypes = ownWorkspaces.map((w) => w.type);
  const requiredTypes = ['private', 'public', 'collaboration'];
  const missingTypes = requiredTypes.filter(
    (type) => !existingTypes.includes(type)
  );

  if (missingTypes.length > 0) {
    await Workspace.createDefaultWorkspaces(req.user._id);
    // Fetch updated own workspaces
    const updatedOwnWorkspaces = await Workspace.find({
      createdBy: req.user._id,
    })
      .populate('members.userId', 'fullName username email avatar')
      .populate('createdBy', 'fullName username email');

    res.status(200).json({
      status: 'success',
      data: {
        ownWorkspaces: updatedOwnWorkspaces,
        memberWorkspaces,
      },
    });
  } else {
    res.status(200).json({
      status: 'success',
      data: {
        ownWorkspaces,
        memberWorkspaces,
      },
    });
  }
});

// Get specific workspace by ID with populated member details
exports.getWorkspaceById = catchAsync(async (req, res, next) => {
  // Find workspace and populate member/creator details
  const workspace = await Workspace.findById(req.params.workspaceId)
    .populate('members.userId', 'fullName username email avatar')
    .populate('createdBy', 'fullName username email');

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

  // Only public workspaces can be modified
  if (workspace.type !== 'public') {
    return next(new AppError('Only team workspace can be modified', 400));
  }

  // Update only allowed fields
  const updatedWorkspace = await Workspace.findByIdAndUpdate(
    req.params.workspaceId,
    {
      name: req.body.name,
      description: req.body.description,
      settings: req.body.settings,
    },
    {
      new: true,
      runValidators: true,
    }
  ).populate('members.userId', 'fullName username email avatar');

  res.status(200).json({
    status: 'success',
    data: { workspace: updatedWorkspace },
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
    (member) =>
      member.userId.toString() === req.params.userId && member.role === 'owner'
  );

  if (isOwner) {
    return next(new AppError('Cannot remove workspace owner', 400));
  }

  // Remove member
  workspace.members = workspace.members.filter(
    (member) => member.userId.toString() !== req.params.userId
  );

  await workspace.save();
  await workspace.populate('members.userId', 'fullName username email avatar');

  res.status(200).json({
    status: 'success',
    data: { workspace },
  });
});

// Get members of a public workspace only
exports.getWorkspaceMembers = catchAsync(async (req, res, next) => {
  const workspace = req.workspace;

  // Only allow for public workspace
  if (workspace.type !== 'public') {
    return next(new AppError('Can only view members of team workspace', 403));
  }

  // Populate member details including virtuals
  await workspace.populate({
    path: 'members.userId',
    select: 'firstName lastName username email fullName',
    options: { virtuals: true },
  });

  let members = workspace.members;

  // Search functionality
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');

    members = workspace.members.filter((member) => {
      const user = member.userId;
      return (
        searchRegex.test(user.fullName) ||
        searchRegex.test(user.username) ||
        searchRegex.test(user.email)
      );
    });
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = members.length;

  const paginatedMembers = members.slice(startIndex, endIndex);

  res.status(200).json({
    status: 'success',
    data: {
      members: paginatedMembers.map((member) => ({
        userId: member.userId._id,
        fullName: member.userId.fullName,
        username: member.userId.username,
        email: member.userId.email,
        role: member.role,
        joinedAt: member.joinedAt,
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalMembers: total,
        hasNextPage: endIndex < total,
        hasPrevPage: page > 1,
        limit,
      },
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

  const { invites } = req.body;
  if (!Array.isArray(invites)) {
    return next(new AppError('Invites must be an array', 400));
  }

  const invitationResults = [];
  const failedInvites = [];

  for (const invite of invites) {
    const { email, role = 'member' } = invite;

    // Check if user exists and is already a member
    const user = await User.findOne({ email });
    if (
      user &&
      workspace.members.some(
        (member) => member.userId.toString() === user._id.toString()
      )
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
    const inviteUrl = `${process.env.FRONTEND_URL}/workspace/join/${inviteToken}`;

    try {
      await sendEmail({
        email,
        subject: `Invitation to join ${workspace.name}`,
        message: `
          <div style="background-color: #f6f9fc; padding: 20px; font-family: Arial, sans-serif;">
            <div style="background-color: white; padding: 20px; border-radius: 10px; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333; text-align: center;">Workspace Invitation</h2>
              <p>You've been invited to join "${workspace.name}" workspace on Beehive.</p>
              <p>Role: ${role}</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" 
                   style="background-color: #0052cc; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 5px;">
                  Accept Invitation
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">This invitation expires in 7 days.</p>
            </div>
          </div>
        `,
      });
      invitationResults.push({ email, status: 'sent' });
    } catch (error) {
      failedInvites.push({ email, reason: 'Email sending failed' });
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
  const workspace = await Workspace.verifyInvitationToken(
    token,
    req.user.email
  );

  if (!workspace) {
    return next(new AppError('Invalid or expired invitation', 400));
  }

  // Find the invitation
  const invitation = workspace.invitations.find(
    (inv) => inv.status === 'pending' && inv.email === req.user.email
  );

  // Add user to workspace members
  workspace.members.push({
    userId: req.user._id,
    role: invitation.role,
  });

  // Update invitation status
  invitation.status = 'accepted';

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

  // Clean up expired invitations
  workspace.invitations = workspace.invitations.filter(
    (inv) => inv.expiresAt > Date.now()
  );
  await workspace.save();

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

/**
 * Validate workspace operations MIDDLEWARE
 * Checks access rights and workspace type restrictions
 */
exports.validateWorkspaceOperation = catchAsync(async (req, res, next) => {
  const workspace = await Workspace.findById(req.params.workspaceId);

  // Check if user has access to workspace
  const member = workspace.members.find((member) =>
    member.userId.equals(req.user._id)
  );

  if (!member) {
    return next(new AppError('You do not have access to this workspace', 403));
  }

  // Special validations for workspace types
  if (
    (workspace.type === 'private' || workspace.type === 'collaboration') &&
    !workspace.createdBy.equals(req.user._id)
  ) {
    return next(new AppError('You cannot modify this workspace', 403));
  }

  // Attach workspace and user role to request
  req.workspace = workspace;
  req.userRole = member.role;
  next();
});

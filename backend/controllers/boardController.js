const crypto = require('crypto');
const Board = require('../models/boardModel');
const Workspace = require('../models/workspaceModel');
const User = require('../models/userModel');
const sendEmail = require('../utils/email');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Create Board
exports.createBoard = catchAsync(async (req, res, next) => {
  const { name, description, workspace, viewPreferences, background } =
    req.body;

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

  const boardData = {
    name,
    description,
    workspace,
    viewPreferences,
    background,
    createdBy: req.user._id,
    members: [
      {
        user: req.user._id,
        role: 'owner',
        watchStatus: 'watching',
      },
    ],
  };

  const board = await Board.create(boardData);

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

  let originalBoard = board;
  let collaborationBoard;

  // 6. Handle workspace type changes if board is in private workspace
  if (board.workspace.type === 'private') {
    // Find owner's public workspace
    const publicWorkspace = await Workspace.findOne({
      createdBy: board.workspace.createdBy,
      type: 'public',
    });

    if (!publicWorkspace) {
      return next(new AppError('Public workspace not found', 404));
    }

    // Move board to public workspace
    board.workspace = publicWorkspace._id;
    board.visibility = 'workspace';
    await board.save();

    // Find or create invited user's collaboration workspace
    let collaborationWorkspace = await Workspace.findOne({
      createdBy: invitedUser._id,
      type: 'collaboration',
    });

    if (!collaborationWorkspace) {
      // Create collaboration workspace if it doesn't exist
      collaborationWorkspace = await Workspace.create({
        name: 'Collaboration Workspace',
        type: 'collaboration',
        createdBy: invitedUser._id,
        members: [{ user: invitedUser._id, role: 'owner' }],
      });
    }
    // Create a new board in the collaboration workspace
    collaborationBoard = await Board.create({
      name: board.name,
      description: board.description,
      workspace: collaborationWorkspace._id,
      background: board.background,
      viewPreferences: board.viewPreferences,
      visibility: 'workspace',
      members: [
        {
          user: invitedUser._id,
          role: role,
          watchStatus: 'tracking',
        },
      ],
      createdBy: invitedUser._id,
      originalBoard: board._id, // Reference to the original board
    });

    // await board.save();
  }

  // 7. Create invitation token
  const inviteToken = board.createInvitationToken(email, role, req.user._id);

  // 8. Generate invitation URL
  const inviteUrl = `${process.env.BASE_URL}/boards/join/${inviteToken}`;

  // 9. Send invitation email
  try {
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

    await board.save();

    res.status(200).json({
      status: 'success',
      message: 'Invitation sent successfully',
    });
  } catch (error) {
    // Remove invitation if email fails
    board.invitations = board.invitations.filter((inv) => inv.email !== email);
    await board.save();

    return next(new AppError('Error sending invitation email', 500));
  }
});

exports.acceptInvitation = catchAsync(async (req, res, next) => {
  const { token } = req.params;

  // 1. Verify token and get board
  const board = await Board.verifyInvitationToken(token);
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

  // 4. Add user to board members
  board.members.push({
    user: user._id,
    role: invitation.role,
    watchStatus: 'tracking',
  });

  // 5. Remove used invitation
  board.invitations = board.invitations.filter(
    (inv) => inv.token !== hashedToken
  );

  await board.save();

  res.status(200).json({
    status: 'success',
    message: 'Successfully joined board',
    data: { board },
  });
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

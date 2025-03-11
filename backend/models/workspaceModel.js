const mongoose = require('mongoose');
const crypto = require('crypto'); // Add this at the top
const User = require('./userModel');
const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      minlength: [3, 'Name must be at least 3 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    type: {
      type: String,
      enum: ['private', 'public', 'collaboration'],
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['owner', 'admin', 'member'], // Roles for workspace members
          default: 'member',
        },
        permissions: {
          type: [String],
          default: function () {
            switch (this.role) {
              case 'owner':
                return [
                  'manage_workspace', // Can modify workspace settings
                  'manage_members', // Can add/remove members
                  'manage_roles', // Can change member roles
                  'create_boards', // Can create new boards
                  'delete_boards', // Can delete boards
                  'invite_members', // Can invite new members
                  'view_members', // Can view member list
                  'manage_settings', // Can change workspace settings
                ];
              case 'admin':
                return [
                  'create_boards', // Can create new boards
                  'delete_own_boards', // Can delete boards they created
                  'invite_members', // Can invite new members
                  'view_members', // Can view member list
                  'manage_settings', // Can change general settings
                ];
              default:
                return [
                  'view_workspace', // Can view workspace
                  'view_boards', // Can view boards in workspace
                ];
            }
          },
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    settings: {
      // Critical Settings (Owner Only)
      inviteRestriction: {
        type: String,
        enum: ['owner', 'admin'],
        default: 'owner',
      },
      boardCreation: {
        type: String,
        enum: ['owner', 'admin'],
        default: 'owner',
      },

      // General Settings (Owner & Admin)
      defaultView: {
        type: String,
        enum: ['board', 'calendar', 'timeline'],
        default: 'board',
      },
      cardCoverEnabled: {
        type: Boolean,
        default: true,
      },
      notificationsEnabled: {
        type: Boolean,
        default: true,
      },
    },
    invitations: [
      {
        email: {
          type: String,
          required: true,
          lowercase: true,
        },
        role: {
          type: String,
          enum: ['admin', 'member'],
          default: 'member',
        },
        invitedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User', // The user who sent the invitation
          required: true,
        },
        token: String, // Hashed token
        tokenExpiresAt: Date,
        status: {
          type: String,
          enum: ['pending', 'expired'],
          default: 'pending',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
workspaceSchema.index({ name: 1, createdBy: 1 });
workspaceSchema.index({ 'members.user': 1 });
workspaceSchema.index({ 'invitations.email': 1, 'invitations.token': 1 });

// Method to check if a user has a specific permission
workspaceSchema.methods.hasPermission = function (userId, permission) {
  const member = this.members.find(
    (m) => m.user.toString() === userId.toString()
  );
  return member && member.permissions.includes(permission);
};

// Method to check if a user is an owner or admin
workspaceSchema.methods.isOwnerOrAdmin = function (userId) {
  const member = this.members.find(
    (m) => m.user.toString() === userId.toString()
  );
  return member && ['owner', 'admin'].includes(member.role);
};

// Method to get member's role
workspaceSchema.methods.getMemberRole = function (userId) {
  const member = this.members.find(
    (m) => m.user.toString() === userId.toString()
  );
  return member ? member.role : null;
};

// VIRTUAL POPULATE, 'Virtual Child Referencing' to get all boards of a workspace
workspaceSchema.virtual('boards', {
  ref: 'Board', // Reference to the Board model
  foreignField: 'workspace', // 'workspace' is the field in board model that reference to Workspace model
  localField: '_id', // The Workspace's ID (used to match boards)
  options: {
    select: '_id', // Only include ID by default
    transform: (doc) => doc._id, // Convert to just ID string
  },
  match: {
    // Only show non-archived boards
    archived: false,
  },
});

// Static method to create default workspaces for a new user
workspaceSchema.statics.createDefaultWorkspaces = async function (
  userId,
  username
) {
  try {
    const workspaces = await this.create([
      {
        name: 'Private Workspace', // More personal name
        description: 'Your private workspace for personal boards',
        type: 'private',
        createdBy: userId,
        members: [{ user: userId, role: 'owner' }],
      },
      {
        name: `${username}'s workspace`, // Personalized team space
        description: 'Share and collaborate on boards with your team',
        type: 'public',
        createdBy: userId,
        members: [{ user: userId, role: 'owner' }],
      },
      {
        name: 'Collaboration Workspace',
        description: 'Access boards shared by others',
        type: 'collaboration',
        createdBy: userId,
        members: [{ user: userId, role: 'owner' }],
      },
    ]);

    if (!workspaces || workspaces.length !== 3) {
      throw new Error('Failed to create all required workspaces');
    }
    return workspaces;
  } catch (error) {
    throw new Error('Failed to create default workspaces: ' + error.message);
  }
};

// Add methods for invitation token handling
workspaceSchema.methods.createInvitationToken = function (
  email,
  role,
  invitedBy
) {
  // Generate random token
  const inviteToken = crypto.randomBytes(32).toString('hex');

  // Hash token for storage
  const hashedToken = crypto
    .createHash('sha256')
    .update(inviteToken)
    .digest('hex');

  // Add invitation to invitations array
  this.invitations.push({
    email,
    role,
    invitedBy,
    token: hashedToken,
    tokenExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    status: 'pending',
  });

  return inviteToken; // Return unhashed token for email
};

// Add static method for verifying invitation token
workspaceSchema.statics.verifyInvitationToken = async function (token, email) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const workspace = await this.findOne({
    invitations: {
      $elemMatch: {
        token: hashedToken,
        tokenExpiresAt: { $gt: Date.now() },
        status: 'pending',
      },
    },
  });

  return workspace;
};

// Automatically clean up expired invitations
workspaceSchema.pre('save', function (next) {
  if (this.invitations && this.invitations.length > 0) {
    // Mark expired invitations
    this.invitations.forEach((invitation) => {
      if (
        invitation.tokenExpiresAt < Date.now() &&
        invitation.status === 'pending'
      ) {
        invitation.status = 'expired';
      }
    });
  }
  next();
});

const Workspace = mongoose.model('Workspace', workspaceSchema);
module.exports = Workspace;

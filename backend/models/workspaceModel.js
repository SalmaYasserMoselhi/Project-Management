const mongoose = require('mongoose');
const crypto = require('crypto'); // Add this at the top
const catchAsync = require('../utils/catchAsync');
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
            {
              switch (this.role) {
                case 'owner':
                  return [
                    'create',
                    'read',
                    'update',
                    'delete',
                    'manage-members',
                  ];
                case 'admin':
                  return ['create', 'read', 'update', 'delete'];
                default:
                  return ['read'];
              }
            }
          },
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
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
    settings: {
      type: Object,
      default: {
        defaultView: 'board',
        cardCoverEnabled: true,
        notificationsEnabled: true,
      },
    },
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

workspaceSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'createdBy',
    select: 'firstName lastName username email',
  });
  next();
});

// Middleware to prevent deletion of default workspaces
workspaceSchema.pre('remove', async function (next) {
  if (
    ['private', 'public', 'collaboration'].includes(this.type) &&
    this.members.some(
      (m) => m.user.equals(this.createdBy) && m.role === 'owner'
    )
  ) {
    throw new Error('Cannot delete default workspace');
  }
  next();
});

// Static method to create default workspaces for a new user
workspaceSchema.statics.createDefaultWorkspaces = async function (userId) {
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
        name: `Team/Public Space`, // Personalized team space
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

workspaceSchema.virtual('boards', {
  ref: 'Board',
  localField: '_id',
  foreignField: 'workspace',
  match: {
    // Only show non-archived boards
    archived: false,
  },
});

const Workspace = mongoose.model('Workspace', workspaceSchema);
module.exports = Workspace;

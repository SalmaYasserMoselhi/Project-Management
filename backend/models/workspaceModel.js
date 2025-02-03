const mongoose = require('mongoose');
const crypto = require('crypto'); // Add this at the top
const catchAsync = require('../utils/catchAsync');

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
    settings: {
      type: Object,
      default: {
        defaultView: 'board',
        cardCoverEnabled: true,
        notificationsEnabled: true,
      },
    },
    members: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['owner', 'admin', 'member'],
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
          ref: 'User',
          required: true,
        },
        token: String, // Hashed token
        tokenExpiresAt: Date,
        status: {
          type: String,
          enum: ['pending', 'accepted', 'expired'],
          default: 'pending',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);
workspaceSchema.index({ name: 1, createdBy: 1 });
workspaceSchema.index({ 'members.userId': 1 });
workspaceSchema.index({ 'invitations.email': 1, 'invitations.token': 1 });

// Static method to create default workspaces for a new user
// workspaceSchema.statics.createDefaultWorkspaces = async function (userId) {
//   const workspaces = await this.create([
//     {
//       name: 'My Workspace', // More personal name
//       description: 'Your private workspace for personal boards',
//       type: 'private',
//       createdBy: userId,
//       members: [{ userId, role: 'owner' }],
//     },
//     {
//       name: `${username}'s Team Space`, // Personalized team space
//       description: 'Share and collaborate on boards with your team',
//       type: 'public',
//       createdBy: userId,
//       members: [{ userId, role: 'owner' }],
//     },
//     {
//       name: 'Collaboration Workspace',
//       description: 'Access boards shared by others',
//       type: 'collaboration',
//       createdBy: userId,
//       members: [{ userId, role: 'member' }],
//     },
//   ]);

//   if (!workspaces || workspaces.length !== 3) {
//     throw new Error('Failed to create all required workspaces');
//   }

//   return workspaces;
// };

// Middleware to prevent deletion of default workspaces
workspaceSchema.pre('remove', async function (next) {
  if (
    ['private', 'public', 'collaboration'].includes(this.type) &&
    this.members.some(
      (m) => m.userId.equals(this.createdBy) && m.role === 'owner'
    )
  ) {
    throw new Error('Cannot delete default workspace');
  }
  next();
});

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
        email: email.toLowerCase(),
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

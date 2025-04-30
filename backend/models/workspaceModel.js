const mongoose = require('mongoose');

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
                  'invite_members', // Can invite new members
                  'view_members', // Can view member list
                  'manage_settings', // Can change workspace settings
                  'manage_permissions', // Can manage permission settings
                ];
              case 'admin':
                return [
                  'manage_members', // Can add/remove regular members
                  'create_boards', // Can create new boards
                  'invite_members', // Can invite new members
                  'view_members', // Can view member list
                  'manage_settings', // Can change workspace settings
                ];
              default:
                return [
                  'view_workspace', // Can view workspace
                  'view_own_boards', // Can view boards they have access to
                  'view_members', // Can view member list
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
        enum: ['owner', 'admin', 'member'],
        default: 'owner',
      },
      boardCreation: {
        type: String,
        enum: ['owner', 'admin', 'member'],
        default: 'owner',
      },

      // disanbled or enabled on the member's account only
      notificationsEnabled: {
        type: Boolean,
        default: true,
      },
    },
    invitations: [
      {
        email: {
          type: String,
          lowercase: true,
        },
        role: {
          type: String,
          enum: ['admin', 'member'],
          default: 'member',
          validate: {
            validator: function (value) {
              return ['admin', 'member'].includes(value);
            },
            message: (props) =>
              `${props.value} is not a valid role for invitation. Role must be either "admin" or "member"`,
          },
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
    // Activities array for workspace-related activities
    activities: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        action: {
          type: String,
          enum: [
            'workspace_created',
            'workspace_updated',
            'workspace_settings_updated',
            'member_added',
            'member_removed',
            'member_role_updated',
            'invitation_sent',
            'invitation_accepted',
            'invitation_cancelled',
            'board_created',
            'board_removed',
            // 'board_shared',
          ],
        },
        data: mongoose.Schema.Types.Mixed,
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

// Method to get member's role
workspaceSchema.methods.getMemberRole = function (userId) {
  const member = this.members.find(
    (m) => m.user.toString() === userId.toString()
  );
  return member ? member.role : null;
};

// Method to check if a user is an owner or admin
workspaceSchema.methods.isOwnerOrAdmin = function (userId) {
  const member = this.members.find(
    (m) => m.user.toString() === userId.toString()
  );
  return member && ['owner', 'admin'].includes(member.role);
};

// Static method to create default workspaces for a new user
workspaceSchema.statics.createDefaultWorkspaces = async function (
  userId,
  username
) {
  try {
    const workspaces = await this.create([
      {
        name: 'Private Space', // More personal name
        description: 'Your private workspace for personal boards',
        type: 'private',
        createdBy: userId,
        members: [{ user: userId, role: 'owner' }],
      },
      {
        name: `${username}'s Workspace`, // Personalized team space
        description: 'Share and collaborate on boards with your team',
        type: 'public',
        createdBy: userId,
        members: [{ user: userId, role: 'owner' }],
      },
      {
        name: 'Collaboration Space',
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

const mongoose = require('mongoose');
const crypto = require('crypto');

const boardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Board name is required'],
      trim: true,
      minlength: [3, 'Name must be at least 3 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Board must belong to a workspace'],
    },
    // Visual Customization
    background: {
      type: {
        type: String,
        enum: ['color', 'image', 'gradient'],
        default: 'color',
      },
      value: {
        type: String,
        default: '#4D2D61', // Default color
      },
    },
    // View Customization
    viewPreferences: {
      defaultView: {
        type: String,
        enum: ['board', 'calendar', 'timeline'],
        default: 'board',
      },
    },
    visibility: {
      type: String,
      enum: ['private', 'workspace', 'public'],
      default: function () {
        // Will be set based on workspace type in pre-save middleware
        return 'private';
      },
    },
    // Members Management
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        invitedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['admin', 'member', 'owner'],
          default: 'member',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        watchStatus: {
          // notification status
          type: String,
          enum: ['watching', 'tracking', 'disabled'], // watching: recieves notification for all activities, tracking: recieves notification for specific activities (his own), disabled: no notifications until he is mentioned
          default: 'tracking',
        },
      },
    ],
    // Lists Reference
    lists: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'List',
      },
    ],
    settings: {
      commentsEnabled: {
        type: Boolean,
        default: true,
      },
      selfJoin: {
        type: Boolean,
        default: false, // Only workspace members can join without invitation
      },
      // defaultLabels: {
      //   type: Boolean,
      //   default: true,
      // },
      listLimit: {
        type: Number,
        default: null, // null means no limit
      },
      dueDateWarnings: {
        type: Boolean,
        default: true,
      },
      emailNotifications: {
        type: Boolean,
        default: true,
      },
    },
    // labels: [
    //   {
    //     name: String,
    //     color: String,
    //     description: String,
    //   },
    // ],
    // Label System
    // labelGroups: [
    //   {
    //     name: String,
    //     description: String,
    //     color: String,
    //   },
    // ],
    // labels: [
    //   {
    //     name: {
    //       type: String,
    //       required: true,
    //     },
    //     color: {
    //       type: String,
    //       required: true,
    //     },
    //     description: String,
    //     groupId: String, // References labelGroup name
    //   },
    // ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
      default: Date.now,
    },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    starred: {
      type: Boolean,
      default: false,
    },
    permissions: {
      canComment: {
        type: String,
        enum: ['admin', 'members'],
        default: 'members',
      },
      canInvite: {
        type: String,
        enum: ['admin', 'members'],
        default: 'admin',
      },
      canDelete: {
        type: String,
        enum: ['admin', 'members'],
        default: 'admin',
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
          ref: 'User',
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
    // WILL BE ADDED LATER
    activities: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        action: {
          type: String,
          enum: [
            'created',
            'updated',
            'deleted',
            'moved',
            'archived',
            'commented',
          ],
        },
        entityType: {
          type: String,
          enum: ['card', 'list', 'board', 'member', 'label'],
        },
        entityId: mongoose.Schema.Types.ObjectId,
        data: Object, // Additional action data
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    originalBoard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      default: null, // null for original board, populated with ID for shared/linked board
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
boardSchema.index({ workspace: 1, name: 1 });
boardSchema.index({ 'members.user': 1 });
boardSchema.index({ createdBy: 1 });
// boardSchema.index({ 'labels.groupId': 1 });

// Add invitation token methods
boardSchema.methods.createInvitationToken = function (email, role, invitedBy) {
  const inviteToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(inviteToken)
    .digest('hex');

  this.invitations.push({
    email,
    role,
    invitedBy,
    token: hashedToken,
    tokenExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    status: 'pending',
  });

  return inviteToken;
};

boardSchema.statics.verifyInvitationToken = async function (token) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const board = await this.findOne({
    invitations: {
      $elemMatch: {
        token: hashedToken,
        tokenExpiresAt: { $gt: Date.now() },
        status: 'pending',
      },
    },
  });

  return board;
};

// Clean expired invitations
boardSchema.pre('save', function (next) {
  if (this.invitations && this.invitations.length > 0) {
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

// Create default labels when a new board is created
// boardSchema.pre('save', async function (next) {
//   if (this.isNew && this.settings.defaultLabels) {
//     // Default label groups
//     const defaultGroups = [
//       {
//         name: 'Priority',
//         description: 'Task priority levels',
//         color: '#FF0000',
//       },
//       {
//         name: 'Status',
//         description: 'Task status indicators',
//         color: '#00FF00',
//       },
//     ];

//     // Default labels
//     const defaultLabels = [
//       {
//         name: 'High Priority',
//         color: '#FF0000',
//         description: 'Urgent tasks',
//         groupId: 'Priority',
//       },
//       {
//         name: 'Medium Priority',
//         color: '#FFA500',
//         description: 'Important tasks',
//         groupId: 'Priority',
//       },
//       {
//         name: 'Low Priority',
//         color: '#00FF00',
//         description: 'Normal tasks',
//         groupId: 'Priority',
//       },
//       {
//         name: 'In Progress',
//         color: '#0000FF',
//         description: 'Currently being worked on',
//         groupId: 'Status',
//       },
//       {
//         name: 'Blocked',
//         color: '#FF0000',
//         description: 'Cannot proceed',
//         groupId: 'Status',
//       },
//     ];

//     this.labelGroups = defaultGroups;
//     this.labels = defaultLabels;
//   }
//   next();
// });

// Pre-save middleware for board model
boardSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('workspace')) {
    try {
      const workspace = await mongoose
        .model('Workspace')
        .findById(this.workspace)
        .populate('members.user', 'name email');

      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Set visibility based on workspace type
      switch (workspace.type) {
        case 'private':
          this.visibility = 'private';
          break;
        case 'public':
          this.visibility = 'workspace';
          break;
        case 'collaboration':
          this.visibility = 'workspace';
          // Allow board creation in collaboration workspace if it's a linked board
          if (this.isNew && !this.originalBoard) {
            throw new Error('Cannot create boards in collaboration workspace');
          }
          break;
        default:
          throw new Error('Invalid workspace type');
      }

      // Skip adding workspace members for boards in collaboration workspace
      if (workspace.type !== 'collaboration') {
        // Add workspace members with same roles
        const workspaceMembers = workspace.members.filter(
          (m) =>
            // Filter out members already in the board
            !this.members.some(
              (bm) => bm.user.toString() === m.user._id.toString()
            )
        );

        // Add members with synchronized roles
        workspaceMembers.forEach((member) => {
          this.members.push({
            user: member.user._id,
            role: member.role,
            watchStatus: member.role === 'owner' ? 'watching' : 'tracking',
            joinedAt: new Date(),
          });
        });
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Methods for label management
boardSchema.methods.addLabelGroup = async function (groupData) {
  this.labelGroups.push(groupData);
  await this.save();
  return this.labelGroups[this.labelGroups.length - 1];
};

// boardSchema.methods.addLabel = async function (labelData) {
//   // Verify group exists if groupId is provided
//   if (
//     labelData.groupId &&
//     !this.labelGroups.some((g) => g.name === labelData.groupId)
//   ) {
//     throw new Error('Label group not found');
//   }

//   this.labels.push(labelData);
//   await this.save();
//   return this.labels[this.labels.length - 1];
// };

// Virtual for counting total cards in board
boardSchema.virtual('totalCards').get(function () {
  return this.lists.reduce((count, list) => count + list.cards.length, 0);
});

// Virtual for getting cards due soon (next 24 hours)
boardSchema.virtual('cardsDueSoon').get(function () {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.lists.reduce((cards, list) => {
    return cards.concat(
      list.cards.filter(
        (card) => card.dueDate && card.dueDate <= tomorrow && !card.completed
      )
    );
  }, []);
});

const Board = mongoose.model('Board', boardSchema);
module.exports = Board;

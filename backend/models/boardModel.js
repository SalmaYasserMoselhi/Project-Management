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

// In boardModel.js - Update the pre-save middleware
boardSchema.pre('save', async function (next) {
  // First, deduplicate existing members based on user ID
  const uniqueMembers = new Map();
  this.members.forEach((member) => {
    const userId = member.user.toString();
    if (!uniqueMembers.has(userId)) {
      uniqueMembers.set(userId, member);
    }
  });
  this.members = Array.from(uniqueMembers.values());

  // Only run workspace sync if the board is new or workspace changed
  if (this.isNew || this.isModified('workspace')) {
    try {
      const workspace = await mongoose
        .model('Workspace')
        .findById(this.workspace)
        .populate('members.user', 'name email');

      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Only proceed if workspace is NOT of type 'collaboration'
      if (workspace.type !== 'collaboration') {
        // Get existing member IDs after deduplication
        const existingMemberIds = new Set(
          this.members.map((m) => m.user.toString())
        );

        // Only add new workspace members
        workspace.members.forEach((wsM) => {
          const wsUserId = wsM.user._id.toString();
          if (!existingMemberIds.has(wsUserId)) {
            this.members.push({
              user: wsM.user._id,
              role: wsM.role,
              joinedAt: new Date(),
              watchStatus: 'tracking',
            });
          }
        });
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Virtual for getting total number of cards
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

boardSchema.methods.syncMemberToCards = async function (newMember) {
  try {
    // Find all cards associated with this board
    const cards = await mongoose.model('Card').find({ boardId: this._id });

    // Add the new member to each card
    const updatePromises = cards.map((card) => {
      return mongoose.model('Card').findByIdAndUpdate(
        card._id,
        {
          $addToSet: {
            members: {
              user: newMember.user,
              assignedBy: newMember.invitedBy || this.createdBy,
              assignedAt: new Date(),
              role: newMember.role === 'admin' ? 'responsible' : 'observer',
            },
          },
        },
        { new: true }
      );
    });

    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error syncing member to cards:', error);
    throw error;
  }
};

// Use this in your board member addition logic
boardSchema.pre('save', async function (next) {
  if (this.isModified('members')) {
    const newMembers = this.members.filter((member) => {
      return !this._originalMembers?.some(
        (original) => original.user.toString() === member.user.toString()
      );
    });

    for (const newMember of newMembers) {
      await this.syncMemberToCards(newMember);
    }
  }
  next();
});

// Store original members before modification
boardSchema.pre('save', function (next) {
  if (this.isModified('members')) {
    this._originalMembers = [...this.members];
  }
  next();
});
const Board = mongoose.model('Board', boardSchema);
module.exports = Board;

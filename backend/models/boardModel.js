const mongoose = require('mongoose');

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
      // Reference to the parent workspace
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Board must belong to a workspace'],
    },
    // View Customization
    // viewPreferences: {
    //   defaultView: {
    //     type: String,
    //     enum: ['board', 'calendar', 'timeline'],
    //     default: 'board',
    //   },
    // },
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
        permissions: {
          type: [String],
          default: function () {
            switch (this.role) {
              case 'owner':
                return [
                  'manage_board',
                  'delete_board',
                  'archive_board',
                  'manage_members',
                  'manage_roles',
                  'create_lists',
                  'edit_lists',
                  'create_cards',
                  'edit_cards',
                  'move_cards',
                  'delete_cards',
                  'assign_members',
                  'create_labels',
                  'comment',
                  'view_board',
                ];
              case 'admin':
                return [
                  'manage_board',
                  'archive_board',
                  'manage_members',
                  'create_lists',
                  'edit_lists',
                  'create_cards',
                  'edit_cards',
                  'move_cards',
                  'delete_cards',
                  'assign_members',
                  'create_labels',
                  'comment',
                  'view_board',
                ];
              default: // member
                return [
                  'view_board',
                  'create_cards',
                  'edit_own_cards',
                  'delete_own_cards',
                  'move_own_cards',
                  'assign_members_for_own_cards',
                  'comment',
                ];
            }
          },
        },
      },
    ],
    settings: {
      // Board Configuration
      general: {
        // (Owner Only)
        // Member list creation permission
        memberListCreation: {
          type: String,
          enum: ['enabled', 'disabled'],
          default: 'disabled',
        },
        // Member invitation permission
        memberInvitation: {
          type: String,
          enum: ['enabled', 'disabled'],
          default: 'disabled',
        },

        // (Owner & Admin)
        // Card editing permission
        cardEditing: {
          type: String,
          enum: ['all_members', 'card_creator_only', 'admins_only'],
          default: 'card_creator_only',
        },
        // Card moving permission
        cardMoving: {
          type: String,
          enum: ['all_members', 'card_creator_only', 'admins_only'],
          default: 'admins_only',
        },
      },
      // Notification Settings
      notifications: {
        emailNotifications: {
          type: Boolean,
          default: true, // Send email notifications for board activities
        },
        appNotifications: {
          type: Boolean,
          default: true, // Send app notifications for board activities
        },
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
    // Centralized activities array
    activities: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        action: {
          type: String,
          enum: [
            'board_created',
            'board_updated',
            'board_archived',
            'board_restored',
            'board_deleted',
            'list_created',
            'list_updated',
            'list_deleted',
            'card_created',
            'card_updated',
            'card_deleted',
            'card_moved',
            'card_status_changed',
            'member_added',
            'member_removed',
            'member_role_updated',
            'invitation_sent',
            'invitation_accepted',
            'invitation_cancelled',
            'label_added',
            'label_updated',
            'label_removed',
            'comment_added',
            'comment_updated',
            'comment_deleted',
            'settings_updated',
            'attachment_added',
            'attachment_removed',
          ],
        },
        entityType: {
          type: String,
          enum: [
            'board',
            'list',
            'card',
            'member',
            'label',
            'comment',
            'settings',
          ],
        },
        entityId: mongoose.Schema.Types.ObjectId,
        data: Object,
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

// Virtual Referencing to List Model
boardSchema.virtual('lists', {
  ref: 'List',
  foreignField: 'board',
  localField: '_id',
  match: { archived: false },
  options: { sort: { position: 1 } },
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
    // Find all cards associated with this board through its lists
    const lists = await mongoose
      .model('List')
      .find({ board: this._id })
      .select('_id');
    const listIds = lists.map((list) => list._id);

    // Find all cards in these lists
    const cards = await mongoose.model('Card').find({ list: { $in: listIds } });

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
        .populate('members.user', 'firstName lastName email');

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

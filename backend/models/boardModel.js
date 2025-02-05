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
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['admin', 'member', 'owner', 'guest'],
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
          default: 'watching',
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
    // Board Settings
    settings: {
      type: Object,
      default: {
        commentsEnabled: true,
        selfJoin: false, // Allow workspace members to join without invitation
        defaultLabels: true, // Create default label set when a new board is created (High Priority, Bug, etc.)
        listLimit: null, // Maximum cards per list (null means no limit)
        dueDateWarnings: true, // Warn users when a card is due soon
        emailNotifications: true, // send email notifications when true, otherwise send in-app notifications only
      },
    },
    // Label System
    labelGroups: [
      {
        name: String,
        description: String,
        color: String,
      },
    ],
    labels: [
      {
        name: String,
        color: String,
        description: String,
        groupId: String, // labelGroup name
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    archived: {
      type: Boolean,
      default: false,
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
boardSchema.index({ workspace: 1 });
boardSchema.index({ 'members.userId': 1 });
boardSchema.index({ createdBy: 1 });

// Create default labels when a new board is created
boardSchema.pre('save', function (next) {
  if (this.isNew && this.settings.defaultLabels) {
    this.labels = [
      {
        name: 'High Priority',
        color: '#ED142E',
        description: 'Urgent tasks needing immediate attention',
      },
      {
        name: 'Medium Priority',
        color: '#fb8500',
        description: 'Important but not urgent tasks',
      },
      {
        name: 'Low Priority',
        color: '#4BE955',
        description: 'Tasks that can wait',
      },
      { name: 'Bug', color: '#e63946', description: 'Issues that need fixing' },
      { name: 'Feature', color: '#F3B9C3', description: 'New functionality' },
      {
        name: 'Enhancement',
        color: '#8F49A2',
        description: 'Improvements to existing features',
      },
    ];
  }
  next();
});

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

boardSchema.methods.addMember = async function(userId, role = 'member') {
  const memberExists = this.members.some(member => member.userId.toString() === userId.toString());
  
  if (memberExists) throw new Error('Member already exists in this board');

  this.members.push({ userId, role });
  await this.save();
};

const Board = mongoose.model('Board', boardSchema);
module.exports = Board;

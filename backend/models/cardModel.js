const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Card title is required'],
      trim: true,
      maxLength: [512, 'Title cannot exceed 512 characters'],
    },
    description: {
      type: String,
      default: '',
      maxLength: [16384, 'Description cannot exceed 16384 characters'],
    },
    // Position of card within its list
    position: {
      type: Number,
      required: true,
    },
    cover: {
      type: String,
      default: '#ffffff', // Default color
    },
    dueDate: {
      startDate: {
        type: Date,
        default: Date.now,
      },
      endDate: Date,
      reminder: Boolean,
    },
    state: {
      current: {
        type: String,
        enum: ['active', 'completed', 'overdue'],
        default: 'active',
      },
      completedAt: Date,
      completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      overdueAt: Date,
      lastStateChange: {
        type: Date,
        default: Date.now,
      },
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        assignedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        assignedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    labels: [
      {
        name: {
          type: String,
          required: [true, 'Label name is required'],
          trim: true,
        },
        color: {
          type: String,
          required: [true, 'Label color is required'],
          validate: {
            validator: function (v) {
              return /^#[0-9A-F]{6}$/i.test(v);
            },
            message: 'Invalid color code',
          },
        },
      },
    ],
    subtasks: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
        },
        isCompleted: {
          type: Boolean,
          default: false,
        },
        position: {
          type: Number,
          required: true,
        },
        assignedTo: {
          // Reference to the assigned user for the subtask
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        dueDate: Date,
        completedAt: Date,
        completedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
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
    list: {
      // Reference to the parent list
      type: mongoose.Schema.Types.ObjectId,
      ref: 'List',
      required: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
    },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    originalPosition: {
      // For restoring archived cards
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
cardSchema.index({ boardId: 1, list: 1, position: 1 });
cardSchema.index({ boardId: 1, 'members.user': 1 });
cardSchema.index(
  { 'dueDate.startDate': 1, 'dueDate.endDate': 1 },
  { sparse: true }
);
cardSchema.index({ 'state.current': 1 });
cardSchema.index({ 'state.lastStateChange': 1 });
cardSchema.index({ list: 1, archived: 1, position: 1 });

// Virtual for comments
cardSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'entityId',
  match: { entityType: 'card' },
});

// Virtual for subtasks completion percentage
cardSchema.virtual('subtasksCompletion').get(function () {
  if (!this.subtasks || this.subtasks.length === 0) return 0;
  const completedSubtasks = this.subtasks.filter(
    (subtask) => subtask.isCompleted
  ).length;
  return Math.round((completedSubtasks / this.subtasks.length) * 100);
});

// Middleware to check for state based on dueDate
cardSchema.pre('save', async function (next) {
  if (this.dueDate?.endDate) {
    const now = new Date();
    const endDate = new Date(this.dueDate.endDate);

    // If end date is in the future and state is overdue, change to active
    if (endDate > now && this.state.current === 'overdue') {
      this.state.current = 'active';
      this.state.lastStateChange = now;
      this.state.overdueAt = undefined;
    }
    // If end date is in the past and state is active, change to overdue
    else if (endDate < now && this.state.current === 'active') {
      this.state.current = 'overdue';
      this.state.overdueAt = now;
      this.state.lastStateChange = now;
    }
  }
  next();
});

// Middleware to handle state changes
cardSchema.pre('save', function (next) {
  if (this.isModified('state.current')) {
    const now = new Date();
    this.state.lastStateChange = now;

    // Set appropriate timestamps based on state
    if (this.state.current === 'completed') {
      this.state.completedAt = now;
    } else if (this.state.current === 'overdue') {
      this.state.overdueAt = now;
    }
  }
  next();
});

// Middleware to update lastActivity
cardSchema.pre('save', function (next) {
  this.lastActivity = new Date();
  next();
});

// Update the position middleware to handle list-specific positioning
cardSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('listId')) {
    try {
      // Find the highest position in the target list
      const lastCard = await this.constructor
        .findOne({ list: this.list })
        .sort('-position');

      // Set position to be last in the list
      this.position = lastCard ? lastCard.position + 1 : 0;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Add this middleware to handle subtask assignment and card member updates
cardSchema.pre('save', async function (next) {
  // Check if subtasks array has changed
  if (this.isModified('subtasks')) {
    const uniqueMembers = new Set();

    // Get all current card members
    this.members.forEach((member) => uniqueMembers.add(member.user.toString()));

    // Check each subtask for assigned members that need to be added to card
    for (const subtask of this.subtasks) {
      if (
        subtask.assignedTo &&
        !uniqueMembers.has(subtask.assignedTo.toString())
      ) {
        // Add new member to card members
        this.members.push({
          user: subtask.assignedTo,
          assignedBy: this.modifiedBy || this.createdBy, // Assuming modifiedBy is tracked somewhere
          assignedAt: new Date(),
        });
        uniqueMembers.add(subtask.assignedTo.toString());
      }
    }

    // Check if all subtasks are completed
    if (
      this.subtasks.length > 0 &&
      this.subtasks.every((task) => task.isCompleted)
    ) {
      if (this.state.current !== 'completed') {
        this.state.current = 'completed';
        this.state.completedAt = new Date();
        this.state.completedBy = this.modifiedBy || this.createdBy;
        this.state.lastStateChange = new Date();
      }
    } else if (
      this.state.current === 'completed' &&
      this.subtasks.some((task) => !task.isCompleted)
    ) {
      // If card was completed but now some subtasks are incomplete
      if (
        this.dueDate?.endDate &&
        new Date(this.dueDate.endDate) < new Date()
      ) {
        this.state.current = 'overdue';
      } else {
        this.state.current = 'active';
      }
      this.state.lastStateChange = new Date();
    }
  }
  next();
});
module.exports = mongoose.model('Card', cardSchema);

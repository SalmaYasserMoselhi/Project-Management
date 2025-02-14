const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Card title is required'],
      trim: true,
      maxLength: 512,
    },
    description: {
      type: String,
      default: '',
      maxLength: 16384,
    },
    // Position of card within its list
    position: {
      type: Number,
      required: true,
      index: true, // Add index for sorting efficiency
      default: 0,
    },
    cover: {
      type: {
        type: String,
        enum: ['color', 'image'],
        default: 'color',
      },
      value: {
        type: String,
        default: '#3179ba', // Default color
      }, // URL for image or color code
    },
    status: {
      type: String,
      enum: ['completed', 'overdue', 'active'],
      default: 'active',
      index: true, // Add index for filtering
    },
    dueDate: {
      date: {
        type: Date,
        default: Date.now,
      },
      reminder: Boolean,
      completed: Boolean,
      completedAt: Date,
      completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reminders: [
        {
          // Add multiple reminders support
          type: Date,
          notified: Boolean,
        },
      ],
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
        role: {
          type: String,
          enum: ['responsible', 'observer'],
          default: 'responsible',
        },
      },
    ],

    watches: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        isWatching: {
          type: Boolean,
          default: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    labels: [
      {
        name: String,
        color: String,
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    customFields: [
      {
        name: String,
        type: {
          type: String,
          enum: ['text', 'number', 'date', 'checkbox', 'select'],
        },
        value: mongoose.Schema.Types.Mixed,
        options: [String], // For select type fields
        required: Boolean,
        position: Number,
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
        dueDate: {
          type: Date,
          default: Date.now,
        },
        assignedTo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },
        position: {
          type: Number,
          required: true,
        },
        completedAt: Date,
        completedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        size: Number,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        metadata: {
          width: Number, // For images
          height: Number, // For images
          duration: Number, // For videos/audio
          thumbnailUrl: String,
        },
      },
    ],

    // Array of comments
    comments: [
      {
        text: {
          // Comment text
          type: String,
          required: true,
        },
        author: {
          // Comment author
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        parentId: {
          type: mongoose.Schema.Types.ObjectId,
          default: null, // null means it's a top-level comment
        },
        mentions: [
          {
            // User mentions in comment
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        ],
        attachments: [
          {
            // Files attached to comment
            name: String, // Attachment name
            url: String, // Attachment URL
            type: String, // Attachment type
          },
        ],
        edited: {
          // Edit tracking
          isEdited: Boolean, // Whether comment was edited
          editedAt: Date, // Last edit timestamp
        },
        createdAt: {
          // Comment creation timestamp
          type: Date,
          default: Date.now,
        },
        reactions: [
          {
            // Add reactions support
            emoji: String,
            users: [
              {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
              },
            ],
          },
        ],
      },
    ],

    activity: [
      {
        action: {
          type: String,
          enum: [
            'created',
            'updated',
            'moved',
            'archived',
            'commented',
            'attachment_added',
            'checklist_updated',
            'member_added',
            'label_added',
            'completed',
          ],
        },
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        data: mongoose.Schema.Types.Mixed,
        timestamp: {
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
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
    },
    listId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'List',
      required: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
      index: true, // Add index for sorting
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Middleware to update lastActivity timestamp before saving
cardSchema.pre('save', function (next) {
  this.lastActivity = new Date(); // Update last activity timestamp
  next(); // Continue with save operation
});

// Middleware to sync card members with board members
cardSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('boardId')) {
    try {
      const board = await mongoose
        .model('Board')
        .findById(this.boardId)
        .populate('members.user');

      if (!board) {
        return next(new Error('Board not found'));
      }

      // Get existing member IDs
      const existingMemberIds = new Set(
        this.members.map((m) => m.user.toString())
      );

      // Add any board members that aren't already on the card
      board.members.forEach((boardMember) => {
        const boardUserId = boardMember.user._id.toString();
        if (!existingMemberIds.has(boardUserId)) {
          this.members.push({
            user: boardMember.user._id,
            assignedBy: this.createdBy, // Use card creator as assigner
            assignedAt: new Date(),
            role: boardMember.role === 'admin' ? 'responsible' : 'observer',
          });
        }
      });
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Update the position middleware to handle list-specific positioning
cardSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('listId')) {
    try {
      // Find the highest position in the target list
      const lastCard = await this.constructor
        .findOne({ listId: this.listId })
        .sort('-position');

      // Set position to be last in the list
      this.position = lastCard ? lastCard.position + 1 : 0;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Add middleware to manage subtask positions
cardSchema.pre('save', function (next) {
  if (this.isModified('subtasks')) {
    // Ensure subtasks are ordered
    this.subtasks.sort((a, b) => a.position - b.position);
  }
  next();
});
module.exports = mongoose.model('Card', cardSchema);

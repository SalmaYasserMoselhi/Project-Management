const mongoose = require('mongoose');

const listSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'List name is required'],
      trim: true,
      minlength: [1, 'Name must be at least 1 character'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    board: {
      // Reference to the parent board
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: [true, 'List must belong to a board'],
    },
    position: {
      type: Number,
      required: true,
      default: 0,
    },
    originalPosition: {
      // Used for restoring archived lists
      type: Number,
      default: null,
    },
    cardLimit: {
      type: Number,
      default: null, // null means no limit
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
    },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    color: {
      type: String,
      default: '#f0f0f0',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
listSchema.index({ board: 1, position: 1 });
listSchema.index({ createdBy: 1 });
// Compound unique index for board and name
listSchema.index(
  { board: 1, name: 1 },
  {
    unique: true,
    name: 'boardNameUnique',
  }
);

// Virtual Child Referencing to Card Model
listSchema.virtual('cards', {
  ref: 'Card',
  foreignField: 'list',
  localField: '_id',
});

// Then modify your totalCards virtual to handle the case when cards aren't populated
listSchema.virtual('totalCards').get(function () {
  return this.cards ? this.cards.length : 0;
});

// Pre-save middleware to handle position for non-archived lists
listSchema.pre('save', async function (next) {
  if (this.isNew && !this.archived) {
    try {
      // If no position specified, get the highest position from non-archived lists and add 1
      if (!this.position) {
        const lastList = await this.constructor
          .findOne({
            board: this.board,
            archived: false,
          })
          .sort('-position');
        this.position = lastList ? lastList.position + 1 : 0;
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Static method to reorder lists (only works with non-archived lists)
listSchema.statics.reorder = async function (boardId, listId, newPosition) {
  // Get all non-archived lists for the board
  const lists = await this.find({
    board: boardId,
    archived: false,
  }).sort('position');

  const list = lists.find((l) => l._id.toString() === listId);
  if (!list) throw new Error('List not found');

  const oldPosition = list.position;

  // Validate newPosition
  if (newPosition < 0) newPosition = 0;
  if (newPosition >= lists.length) newPosition = lists.length - 1;

  // If position didn't change, return early
  if (oldPosition === newPosition) return list;

  // Remove list from its current position
  lists.splice(oldPosition, 1);
  // Insert list at new position
  lists.splice(newPosition, 0, list);

  // Update all positions
  const bulkOps = lists.map((list, index) => ({
    updateOne: {
      filter: { _id: list._id },
      update: { $set: { position: index } },
    },
  }));

  await this.bulkWrite(bulkOps);

  // Refresh list data
  const updatedList = await this.findById(listId);
  return updatedList;
};

// Helper method to resequence all list positions
listSchema.statics.resequencePositions = async function (boardId) {
  const lists = await this.find({
    board: boardId,
    archived: false,
  }).sort('position');

  const bulkOps = lists.map((list, index) => ({
    updateOne: {
      filter: { _id: list._id },
      update: { $set: { position: index } },
    },
  }));

  if (bulkOps.length > 0) {
    await this.bulkWrite(bulkOps);
  }
};

// Method to archive a list
listSchema.methods.archive = async function (userId) {
  this.originalPosition = this.position;
  this.archived = true;
  this.archivedAt = Date.now();
  this.archivedBy = userId;

  await this.save();
};

// Method to restore a list
listSchema.methods.restore = async function () {
  // Get all current active lists
  const activeLists = await this.constructor
    .find({
      board: this.board,
      archived: false,
    })
    .sort('position');

  const targetPosition = Math.min(
    this.originalPosition || 0,
    activeLists.length // Ensure we don't exceed the current list count
  );

  // Move lists to make space
  await this.constructor.updateMany(
    {
      board: this.board,
      archived: false,
      position: { $gte: targetPosition },
    },
    { $inc: { position: 1 } }
  );

  // Restore the list
  this.archived = false;
  this.archivedAt = undefined;
  this.archivedBy = undefined;
  this.position = targetPosition;
  this.originalPosition = undefined;
  await this.save();

  // Resequence all positions to ensure no duplicates
  await this.constructor.resequencePositions(this.board);
};
const List = mongoose.model('List', listSchema);
module.exports = List;

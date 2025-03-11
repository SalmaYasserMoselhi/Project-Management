const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
    workspaceId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Workspace',
    },
    boardId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Board',
    },
    lastMessage: {
      type: mongoose.Schema.ObjectId,
      ref: 'Message',
    },
    isGroup: {
      type: Boolean,
      default: false,
    },
    groupName: String,
    groupAdmin: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for faster queries
conversationSchema.index({ participants: 1 });
conversationSchema.index({ workspaceId: 1 });

const Conversation = mongoose.model(
  'Conversation',
  mongoose.modelName('Conversation') || 'Conversation',
  conversationSchema
);

module.exports = Conversation;

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A message must have a sender'],
    },
    recipient: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    workspaceId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Workspace',
    },
    boardId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Board',
    },
    content: {
      type: String,
      required: [true, 'A message cannot be empty'],
    },
    read: {
      type: Boolean,
      default: false,
    },
    attachments: [
      {
        name: String,
        url: String,
        type: String,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for faster queries
messageSchema.index({ sender: 1, recipient: 1 });
messageSchema.index({ workspaceId: 1 });
messageSchema.index({ boardId: 1 });

const Message = mongoose.model(
  'Message',
  mongoose.modelName('Message') || 'Message',
  messageSchema
);

module.exports = Message;

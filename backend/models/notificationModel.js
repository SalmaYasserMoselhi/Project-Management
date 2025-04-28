const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: [
        'board_invitation',
        'workspace_invitation',
        'card_assignment',
        'card_due_soon',
        'card_comment',
        'card_moved',
        'member_added',
        'list_created',
        'board_shared',
        'mention',
        'message',
      ],
      required: true
    },
    read: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: Date,
    entityType: {
      type: String,
      enum: ['board', 'workspace', 'card', 'list', 'comment', 'message'],
      required: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    data: mongoose.Schema.Types.Mixed, // Additional data specific to notification type
    message: {
      type: String,
      required: true
    },
  },
  {
    timestamps: true
  }
);

// Indexes for better query performance
notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ entityType: 1, entityId: 1 });

// Method to generate notification message based on type and data
notificationSchema.statics.generateMessage = function (type, data, sender) {
  const senderName = sender.firstName 
    ? `${sender.firstName} ${sender.lastName || ''}`.trim() 
    : sender.username;
  
  switch (type) {
    case 'board_invitation':
      return `${senderName} invited you to join the board "${data.boardName}"`;
    case 'workspace_invitation':
      return `${senderName} invited you to join the workspace "${data.workspaceName}"`;
    case 'card_assignment':
      return `${senderName} assigned you to the card "${data.cardTitle}"`;
    case 'card_due_soon':
      return `Card "${data.cardTitle}" is due soon`;
    case 'card_comment':
      return `${senderName} commented on card "${data.cardTitle}"`;
    case 'card_moved':
      return `${senderName} moved card "${data.cardTitle}" to list "${data.listName}"`;
    case 'member_added':
      return `${senderName} added you to the ${data.entityType} "${data.entityName}"`;
    case 'list_created':
      return `${senderName} created a new list "${data.listName}" in board "${data.boardName}"`;
    case 'board_shared':
      return `${senderName} shared a board "${data.boardName}" with you`;
    case 'mention':
      return `${senderName} mentioned you in ${data.entityType} "${data.entityName}"`;
    case 'message':
      return `${senderName} sent you a message`;
    default:
      return `You have a new notification`;
  }
};

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
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
        // Existing types
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
        // New types
        'board_created',
        'board_updated',
        'board_deleted',
        'list_updated',
        'list_deleted',
        'list_archived',
        'list_restored',
        'card_created',
        'card_updated',
        'card_deleted',
        'card_status_changed',
        'card_archived',
        'card_restored',
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
        'comment_replied',
        'settings_updated',
        'attachment_added',
        'attachment_removed',
        'meeting_created',
        'meeting_deleted',
        'meeting_updated',
        'meeting_attendees_added',
        'meeting_attendee_removed'
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
      enum: ['board', 'workspace', 'card', 'list', 'comment', 'message', 'meeting', 'label', 'attachment'],
      required: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    data: mongoose.Schema.Types.Mixed,
    message: {
      type: String,
      required: true
    },
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ entityType: 1, entityId: 1 });

notificationSchema.statics.generateMessage = function (type, data, sender) {
  const senderName = sender.firstName 
    ? `${sender.firstName} ${sender.lastName || ''}`.trim() 
    : sender.username;

  switch (type) {
    // Existing notification messages
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

    // New notification messages
    case 'board_created':
      return `${senderName} created a new board "${data.boardName}"`;
    case 'board_updated':
      return `${senderName} updated the board "${data.boardName}"`;
    case 'board_deleted':
      return `${senderName} deleted the board "${data.boardName}"`;
    case 'list_updated':
      return `${senderName} updated the list "${data.listName}" in board "${data.boardName}"`;
    case 'list_deleted':
      return `${senderName} deleted the list "${data.listName}" from board "${data.boardName}"`;
    case 'list_archived':
      return `${senderName} archived the list "${data.listName}" in board "${data.boardName}"`;
    case 'list_restored':
      return `${senderName} restored the list "${data.listName}" in board "${data.boardName}"`;
    case 'card_created':
      return `${senderName} created a new card "${data.cardTitle}" in list "${data.listName}"`;
    case 'card_updated':
      return `${senderName} updated the card "${data.cardTitle}"`;
    case 'card_deleted':
      return `${senderName} deleted the card "${data.cardTitle}"`;
    case 'card_status_changed':
      return `${senderName} changed the status of "${data.cardTitle}" to ${data.newStatus}`;
    case 'card_archived':
      return `${senderName} archived the card "${data.cardTitle}"`;
    case 'card_restored':
      return `${senderName} restored the card "${data.cardTitle}"`;
    case 'member_removed':
      return `${senderName} removed you from the ${data.entityType} "${data.entityName}"`;
    case 'member_role_updated':
      return `${senderName} updated your role to ${data.newRole} in ${data.entityType} "${data.entityName}"`;
    case 'label_added':
      return `${senderName} added label "${data.labelName}" to ${data.entityType} "${data.entityName}"`;
    case 'label_updated':
      return `${senderName} updated label "${data.labelName}" in ${data.entityType} "${data.entityName}"`;
    case 'label_removed':
      return `${senderName} removed label "${data.labelName}" from ${data.entityType} "${data.entityName}"`;
    case 'comment_added':
      return `${senderName} added a comment on ${data.entityType} "${data.entityName}"`;
    case 'comment_replied':
      return `${senderName} replied to a comment on ${data.entityType} "${data.entityName}"`;
    case 'comment_updated':
      return `${senderName} updated their comment on ${data.entityType} "${data.entityName}"`;
    case 'comment_deleted':
      return `${senderName} deleted their comment from ${data.entityType} "${data.entityName}"`;
    case 'settings_updated':
      return `${senderName} updated settings for ${data.entityType} "${data.entityName}"`;
    case 'attachment_added':
      return `${senderName} added an attachment to ${data.entityType} "${data.entityName}"`;
    case 'attachment_removed':
      return `${senderName} removed an attachment from ${data.entityType} "${data.entityName}"`;
    case 'meeting_created':
      return `${senderName} scheduled a new meeting "${data.meetingTitle}"`;
    case 'meeting_deleted':
      return `${senderName} cancelled the meeting "${data.meetingTitle}"`;
    case 'meeting_updated':
      return `${senderName} updated the meeting "${data.meetingTitle}"`;
    case 'meeting_attendees_added':
      return `${senderName} added you to the meeting "${data.meetingTitle}"`;
    case 'meeting_attendee_removed':
      return `${senderName} removed you from the meeting "${data.meetingTitle}"`;
    default:
      return `You have a new notification`;
  }
};

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
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
        'workspace_welcome',
        'card_assignment',
        'card_due_soon',
        'card_comment',
        'card_moved',
        'member_added',
        'list_created',
        'board_shared',
        'mention',
        'message',
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
        'meeting_attendee_removed',
        'meeting_reminder'
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

  // Helper function to safely get entity name
  const getEntityName = (data) => {
    return data.entityName || data.cardTitle || data.boardName || data.listName || 'item';
  };

  // Helper function to safely get entity type
  const getEntityType = (data) => {
    return data.entityType || 'item';
  };

  // Helper function to safely handle undefined/null values in strings
  const safeString = (value, fallback = 'item') => {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }
    return value;
  };

  switch (type) {
    // Existing notification messages - FIXED
    case 'board_invitation':
      return `${senderName} invited you to join the board "${safeString(data.boardName, 'a board')}"`;
    case 'workspace_invitation':
      return `${senderName} invited you to join the workspace "${safeString(data.workspaceName, 'a workspace')}"`;
    case 'workspace_welcome':
      return `Welcome to the workspace "${safeString(data.workspaceName, 'a workspace')}"! You now have ${safeString(data.role, 'member')} access.`;
    case 'card_assignment':
      return `${senderName} assigned you to the card "${safeString(data.cardTitle, 'a card')}"`;
    case 'card_due_soon':
      return `Card "${safeString(data.cardTitle, 'a card')}" is due soon`;
    case 'card_comment':
      return `${senderName} commented on card "${safeString(data.cardTitle, 'a card')}"`;
    case 'card_moved':
      return `${senderName} moved card "${safeString(data.cardTitle, 'a card')}" to list "${safeString(data.toList || data.listName, 'a list')}"`;
    case 'member_added':
      return `${senderName} added you to the ${getEntityType(data)} "${getEntityName(data)}"`;
    case 'list_created':
      return `${senderName} created a new list "${safeString(data.listName, 'a list')}" in board "${safeString(data.boardName, 'a board')}"`;
    case 'board_shared':
      return `${senderName} shared a board "${safeString(data.boardName, 'a board')}" with you`;
    case 'mention':
      return `${senderName} mentioned you in ${getEntityType(data)} "${getEntityName(data)}"`;
    case 'message':
      return `${senderName} sent you a message`;
    case 'invitation_sent':
      return `${senderName} sent an invitation to join ${getEntityType(data)} "${getEntityName(data)}"`;
  case 'invitation_accepted':
      return `${senderName} accepted your invitation to join ${getEntityType(data)} "${getEntityName(data)}"`;
  case 'invitation_cancelled':
      return `${senderName} cancelled the invitation to join ${getEntityType(data)} "${getEntityName(data)}"`;

    // New notification messages - FIXED
    case 'board_created':
      return `${senderName} created a new board "${safeString(data.boardName, 'a board')}"`;
    case 'board_updated':
      return `${senderName} updated the board "${safeString(data.boardName, 'a board')}"`;
    case 'board_deleted':
      return `${senderName} deleted the board "${safeString(data.boardName, 'a board')}"`;
    case 'list_updated':
      return `${senderName} updated the list "${safeString(data.listName, 'a list')}" in board "${safeString(data.boardName, 'a board')}"`;
    case 'list_deleted':
      return `${senderName} deleted the list "${safeString(data.listName, 'a list')}" from board "${safeString(data.boardName, 'a board')}"`;
    case 'list_archived':
      return `${senderName} archived the list "${safeString(data.listName, 'a list')}" in board "${safeString(data.boardName, 'a board')}"`;
    case 'list_restored':
      return `${senderName} restored the list "${safeString(data.listName, 'a list')}" in board "${safeString(data.boardName, 'a board')}"`;
    case 'card_created':
      return `${senderName} created a new card "${safeString(data.cardTitle, 'a card')}" in list "${safeString(data.listName, 'a list')}"`;
    case 'card_updated':
      return `${senderName} updated the card "${safeString(data.cardTitle, 'a card')}"`;
    case 'card_deleted':
      return `${senderName} deleted the card "${safeString(data.cardTitle, 'a card')}"`;
    case 'card_status_changed':
      return `${senderName} changed the status of "${safeString(data.cardTitle, 'a card')}" to ${safeString(data.newStatus, 'a new status')}`;
    case 'card_archived':
      return `${senderName} archived the card "${safeString(data.cardTitle, 'a card')}"`;
    case 'card_restored':
      return `${senderName} restored the card "${safeString(data.cardTitle, 'a card')}"`;
    case 'member_removed':
      return `${senderName} removed you from the ${getEntityType(data)} "${getEntityName(data)}"`;
    case 'member_role_updated':
      return `${senderName} updated your role to ${safeString(data.newRole, 'a new role')} in ${getEntityType(data)} "${getEntityName(data)}"`;
    case 'label_added':
      return `${senderName} added label "${safeString(data.labelName, 'a label')}" to ${getEntityType(data)} "${getEntityName(data)}"`;
    case 'label_updated':
      return `${senderName} updated label "${safeString(data.labelName, 'a label')}" in ${getEntityType(data)} "${getEntityName(data)}"`;
    case 'label_removed':
      return `${senderName} removed label "${safeString(data.labelName, 'a label')}" from ${getEntityType(data)} "${getEntityName(data)}"`;
    
    // Comment-related cases - FIXED
    case 'comment_added':
      return `${senderName} added a comment on card "${safeString(data.cardTitle, 'a card')}"`;
    case 'comment_replied':
      return `${senderName} replied to a comment on card "${safeString(data.cardTitle, 'a card')}"`;
    case 'comment_updated':
      return `${senderName} updated their comment on card "${safeString(data.cardTitle, 'a card')}"`;
    case 'comment_deleted':
      return `${senderName} deleted their comment from card "${safeString(data.cardTitle, 'a card')}"`;
    
    case 'settings_updated':
      return `${senderName} updated settings for ${getEntityType(data)} "${getEntityName(data)}"`;
    case 'attachment_added':
      return `${senderName} added an attachment to ${getEntityType(data)} "${getEntityName(data)}"`;
    case 'attachment_removed':
      return `${senderName} removed an attachment from ${getEntityType(data)} "${getEntityName(data)}"`;
    case 'meeting_created':
      return `${senderName} scheduled a new meeting "${safeString(data.meetingTitle, 'a meeting')}"`;
    case 'meeting_deleted':
      return `${senderName} cancelled the meeting "${safeString(data.meetingTitle, 'a meeting')}"`;
    case 'meeting_updated':
      return `${senderName} updated the meeting "${safeString(data.meetingTitle, 'a meeting')}"`;
    case 'meeting_attendees_added':
      return `${senderName} added you to the meeting "${safeString(data.meetingTitle, 'a meeting')}"`;
    case 'meeting_attendee_removed':
      return `${senderName} removed you from the meeting "${safeString(data.meetingTitle, 'a meeting')}"`;
    case 'meeting_reminder':
      return `Reminder: Meeting "${safeString(data.meetingTitle, 'a meeting')}" starts in 1 hour`;
    default:
      return `You have a new notification from ${senderName}`;
  }
};

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
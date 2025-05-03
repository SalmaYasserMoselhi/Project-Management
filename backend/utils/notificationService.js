const Notification = require('../models/notificationModel');
const User = require('../models/userModel');

/**
 * Centralized service for handling notifications
 */
const notificationService = {
  /**
   * Create a notification and emit socket event
   * @param {Object} io - Socket.io instance
   * @param {String} recipientId - User ID of recipient
   * @param {String} senderId - User ID of sender
   * @param {String} type - Notification type
   * @param {String} entityType - Type of entity (board, card, etc.)
   * @param {String} entityId - ID of entity
   * @param {Object} data - Additional data for notification
   * @returns {Object} - Created notification
   */
  async createNotification(
    io,
    recipientId,
    senderId,
    type,
    entityType,
    entityId,
    data = {}
  ) {
    try {
      // Don't send notifications to yourself
      if (recipientId.toString() === senderId.toString()) {
        return null;
      }

      // Get sender info for message generation
      const sender = await User.findById(senderId).select(
        'firstName lastName username'
      );
      if (!sender) {
        console.error('Sender not found for notification');
        return null;
      }

      // Generate the notification message
      const message = Notification.generateMessage(type, data, sender);

      // Add logging
      console.log(
        `Creating notification: ${type} for user ${recipientId} from ${senderId}`
      );

      // Create notification in database
      const notification = await Notification.create({
        recipient: recipientId,
        sender: senderId,
        type,
        entityType,
        entityId,
        data,
        message,
      });

      console.log(`Notification created with ID: ${notification._id}`);

      // Populate notification with sender info before sending
      const populatedNotification = await Notification.findById(
        notification._id
      )
        .populate('sender', 'firstName lastName username avatar')
        .populate('recipient', 'firstName lastName username');

          // Determine which io instance to use
    let ioInstance = io;
    
    if (!ioInstance && global.io) {
      console.log('Using global.io as fallback');
      ioInstance = global.io;
    }

      // Emit socket event
      if (ioInstance) {
        ioInstance.to(recipientId.toString()).emit(
          'new_notification',
          populatedNotification
        );
        console.log(
          `Socket event 'new_notification' emitted to user ${recipientId}`
        );
      } else {
        console.log(
          'Socket IO instance not available, notification created but not emitted'
        );
      }

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  },

  /**
   * Get notifications for a user with pagination
   * @param {String} userId - User ID
   * @param {Object} options - Query options
   * @returns {Object} - Paginated notifications
   */
  async getUserNotifications(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      unreadOnly = false,
      sort = '-createdAt',
    } = options;

    const query = { recipient: userId };

    // Filter unread notifications if specified
    if (unreadOnly) {
      query.read = false;
    }

    // Count total notifications matching query
    const total = await Notification.countDocuments(query);

    // Get paginated results
    const notifications = await Notification.find(query)
      .populate('sender', 'firstName lastName username avatar')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Count unread notifications
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      read: false,
    });

    return {
      notifications,
      pagination: {
        total,
        unreadCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Mark notifications as read
   * @param {String} userId - User ID
   * @param {String|Array} notificationIds - Single ID or array of notification IDs to mark as read
   * @param {Boolean} markAll - Whether to mark all notifications as read
   * @returns {Object} - Result of the operation
   */
  async markAsRead(userId, notificationIds = null, markAll = false) {
    try {
      // Base query to ensure user can only mark their own notifications
      const baseQuery = { recipient: userId };

      // If markAll is true, update all notifications for the user
      if (markAll) {
        const result = await Notification.updateMany(
          { ...baseQuery, read: false },
          { read: true, readAt: new Date() }
        );

        return {
          success: true,
          count: result.nModified || result.modifiedCount,
          message: `Marked ${
            result.nModified || result.modifiedCount
          } notifications as read`,
        };
      }

      // If notificationIds is provided, update specific notifications
      if (notificationIds) {
        // Convert single ID to array if needed
        const ids = Array.isArray(notificationIds)
          ? notificationIds
          : [notificationIds];

        const result = await Notification.updateMany(
          { ...baseQuery, _id: { $in: ids }, read: false },
          { read: true, readAt: new Date() }
        );

        return {
          success: true,
          count: result.nModified || result.modifiedCount,
          message: `Marked ${
            result.nModified || result.modifiedCount
          } notifications as read`,
        };
      }

      return {
        success: false,
        message: 'No notifications specified to mark as read',
      };
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      return {
        success: false,
        message: 'Error marking notifications as read',
        error: error.message,
      };
    }
  },

  /**
   * Delete notifications
   * @param {String} userId - User ID
   * @param {String|Array} notificationIds - Single ID or array of notification IDs to delete
   * @returns {Object} - Result of the operation
   */
  async deleteNotifications(userId, notificationIds) {
    try {
      // Convert single ID to array if needed
      const ids = Array.isArray(notificationIds)
        ? notificationIds
        : [notificationIds];

      // Delete notifications, ensuring user can only delete their own
      const result = await Notification.deleteMany({
        recipient: userId,
        _id: { $in: ids },
      });

      return {
        success: true,
        count: result.deletedCount,
        message: `Deleted ${result.deletedCount} notifications`,
      };
    } catch (error) {
      console.error('Error deleting notifications:', error);
      return {
        success: false,
        message: 'Error deleting notifications',
        error: error.message,
      };
    }
  },
};

module.exports = notificationService;

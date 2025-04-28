const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const notificationService = require('../utils/notificationService');

exports.getMyNotifications = catchAsync(async (req, res, next) => {
  const { page, limit, unreadOnly, sort } = req.query;
  const userId = req.user._id;

  // Get notifications with pagination
  const result = await notificationService.getUserNotifications(userId, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    unreadOnly: unreadOnly === 'true',
    sort: sort || '-createdAt',
  });

  res.status(200).json({
    status: 'success',
    data: {
      notifications: result.notifications,
      pagination: result.pagination,
    },
  });
});

exports.markAsRead = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { notificationIds, all } = req.body;

  // Check if at least one parameter is provided
  if (!notificationIds && all !== true) {
    return next(
      new AppError(
        'Please provide either notification IDs or set all=true to mark all as read',
        400
      )
    );
  }

  // Mark notifications as read
  const result = await notificationService.markAsRead(
    userId,
    notificationIds,
    all === true
  );

  if (!result.success) {
    return next(new AppError(result.message, 400));
  }

  res.status(200).json({
    status: 'success',
    message: result.message,
    data: {
      count: result.count,
    },
  });
});

exports.deleteNotification = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { id } = req.params;

  const result = await notificationService.deleteNotifications(userId, id);

  if (!result.success) {
    return next(new AppError(result.message, 400));
  }

  res.status(200).json({
    status: 'success',
    message: 'Notification deleted successfully',
  });
});

exports.deleteMultipleNotifications = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { notificationIds } = req.body;

  if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
    return next(
      new AppError('Please provide an array of notification IDs to delete', 400)
    );
  }

  const result = await notificationService.deleteNotifications(
    userId,
    notificationIds
  );

  if (!result.success) {
    return next(new AppError(result.message, 400));
  }

  res.status(200).json({
    status: 'success',
    message: result.message,
    data: {
      count: result.count,
    },
  });
});

// Get unread notification count (useful for badges in UI)
exports.getUnreadCount = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const result = await notificationService.getUserNotifications(userId, {
    limit: 1,
    unreadOnly: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      unreadCount: result.pagination.unreadCount,
    },
  });
});
// routes/notificationRoutes.js
const express = require('express');
const notificationController = require('../controllers/notificationController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes - notifications require authentication
router.use(authController.protect);

// Get user's notifications with options for pagination and filtering
router.get('/', notificationController.getMyNotifications);

// Get count of unread notifications
router.get('/unread-count', notificationController.getUnreadCount);

// Mark notifications as read
router.patch('/mark-read', notificationController.markAsRead);

// Delete a single notification
router.delete('/:id', notificationController.deleteNotification);

// Delete multiple notifications
router.delete('/', notificationController.deleteMultipleNotifications);

module.exports = router;
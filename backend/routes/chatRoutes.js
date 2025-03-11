const express = require('express');
const chatController = require('../controllers/chatController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

router.get('/conversations', chatController.getConversations);
router.post('/conversations', chatController.createConversation);
router.get(
  '/conversations/:conversationId/messages',
  chatController.getMessages
);
router.post(
  '/conversations/:conversationId/messages',
  chatController.sendMessage
);
router.get('/unread', chatController.getUnreadCount);

module.exports = router;

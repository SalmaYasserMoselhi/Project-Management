const express = require('express');
const messageController = require('../controllers/messageController.js');
const authController = require('../controllers/authController');
const attachmentController = require('../controllers/attachmentController');

const router = express.Router();

router.post(
  '/',
  authController.protect,
  // messageController.uploadMessageFiles,
  attachmentController.uploadAttachments,
  messageController.sendMessage
);
router.get('/:convoId', authController.protect, messageController.getMessages);
router.delete(
  '/:messageId',
  authController.protect,
  messageController.deleteMessage
);

// Add a route for downloading message files
router.get('/download/:fileId', authController.protect, (req, res, next) => {
  // Redirect to the attachment download route
  res.redirect(`/api/v1/attachments/download/${req.params.fileId}`);
});

module.exports = router;

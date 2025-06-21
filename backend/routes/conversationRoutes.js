const express = require('express');
// const trimRequest = require('trim-request');
const authController = require('./../controllers/authController');
const conversationController = require('./../controllers/conversationController');

const router = express.Router();
router
  .route('/')
  .post(authController.protect, conversationController.createOpenConversation);
router
  .route('/')
  .get(authController.protect, conversationController.getConversations);
router
  .route('/group')
  .post(
    authController.protect,
    conversationController.uploadGroupPicture,
    conversationController.resizeUserAvatar,
    conversationController.createGroup
  );

router.patch(
  '/group/add-user',
  authController.protect,
  conversationController.addUserToGroup
);
router.patch(
  '/group/remove-user',
  authController.protect,
  conversationController.removeUserFromGroup
);
router.patch(
  '/group/leave',
  authController.protect,
  conversationController.leaveGroup
);

// Add authentication middleware to delete routes
router.delete(
  '/:id',
  authController.protect,
  conversationController.deleteConversation
);
router.delete(
  '/group/:id',
  authController.protect,
  conversationController.deleteGroup
);

module.exports = router;

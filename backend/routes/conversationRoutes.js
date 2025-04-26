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
  .post(authController.protect, conversationController.createGroup);
module.exports = router;

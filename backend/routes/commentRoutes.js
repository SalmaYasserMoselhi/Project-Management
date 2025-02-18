const express = require('express');
const commentController = require('../controllers/commentController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true }); // To access cardId from parent router

// Protect all routes
router.use(authController.protect);

// Comment operations
router
  .route('/')
  .post(commentController.createComment)
  .get(commentController.getComments);
router
  .route('/:id')
  .patch(commentController.updateComment)
  .delete(commentController.deleteComment);

// Comment actions
router.post('/:id/reply', commentController.replyToComment);

module.exports = router;

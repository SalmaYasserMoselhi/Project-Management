const express = require('express');
const cardController = require('../controllers/cardController');
const authController = require('../controllers/authController');
const router = express.Router();

router.use(authController.protect);

router.post('/', cardController.createCard);
router.get('/:cardId', cardController.getCard);
router.delete('/:cardId', cardController.deleteCard);
// test but must be in ListRoutes
router.get('/list/cards/:listId', cardController.getListCards);
router.patch('/update-card/:cardId', cardController.updateCard);
router.post('/add-comment/:cardId', cardController.addComment);
router.patch('/:cardId/edit-comment/:commentId', cardController.updateComment);
router.delete(
  '/:cardId/delete-comment/:commentId',
  cardController.deleteComment
);
router.post('/:cardId/comment/:commentId/reply', cardController.replyToComment);
router.post(
  '/:cardId/comment/:commentId/reactions',
  cardController.addCommentReaction
);
router.get(
  '/:cardId/comment/:commentId/thread',
  cardController.getCommentThread
);

router.patch('/update-due-date/:cardId', cardController.updateDueDate);
router.post('/create-subtasks/:cardId', cardController.addSubtask);
router.patch(
  '/:cardId/update-subtask/:subtaskId',
  cardController.updateSubtask
);
router.patch(
  '/:cardId/subtask/:subtaskId/toggle',
  cardController.toggleSubtask
);

router.delete('/:cardId/subtask/:subtaskId', cardController.deleteSubtask);
router.get('/:cardId/subtasks', cardController.getCardSubtasks);

module.exports = router;

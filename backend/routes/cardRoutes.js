const express = require('express');
const cardController = require('../controllers/cardController');
const authController = require('../controllers/authController');
const commentRouter = require('./commentRoutes.js');

const router = express.Router({ mergeParams: true }); // To access listId from parent router

router.use(authController.protect);

// Use comment routes
router.use('/:cardId/comments', commentRouter);

// test but must be in ListRoutes
router.get('/list/:listId/cards', cardController.getListCards);

// Card CRUD routes
router.route('/').post(cardController.createCard);
router
  .route('/:cardId')
  .get(cardController.getCard)
  .patch(cardController.updateCard)
  .delete(cardController.deleteCard);

// Card completion route
router.patch('/:cardId/toggle', cardController.toggleCard);

// Card label routes
router.post('/:cardId/labels', cardController.addLabel);
router
  .route('/:cardId/labels/:labelId')
  .delete(cardController.removeLabel)
  .patch(cardController.updateLabel);

// Card due date route
router.route('/:cardId/dueDate').patch(cardController.updateDueDate);

// Card Member routes
router
  .route('/:cardId/members')
  .get(cardController.getCardMembers)
  .post(cardController.addMember);
router.delete('/:cardId/members/:userId', cardController.removeMember);

// Card moving from list to list routes
router.patch('/:cardId/move', cardController.moveCard);

// Subtask routes
router
  .route('/:cardId/subtasks')
  .post(cardController.addSubtask)
  .get(cardController.getCardSubtasks);

router
  .route('/:cardId/subtasks/:subtaskId')
  .patch(cardController.updateSubtask)
  .delete(cardController.deleteSubtask);

router.patch(
  '/:cardId/subtasks/:subtaskId/toggle',
  cardController.toggleSubtask
);

// Card archive/restore routes
router.patch('/:cardId/archive', cardController.archiveCard);
router.patch('/:cardId/restore', cardController.restoreCard);

// Get archived cards for a list
router.get('/list/:listId/archived', cardController.getArchivedCards);

module.exports = router;

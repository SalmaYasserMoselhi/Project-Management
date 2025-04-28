const express = require('express');
const listController = require('../controllers/listController');
const authController = require('../controllers/authController');
const cardController = require('../controllers/cardController');

const router = express.Router({ mergeParams: true }); // To access boardId from parent router

// Protect all routes after this middleware
router.use(authController.protect);

// Get lists for a board
router.get('/board/:boardId/lists', listController.getBoardLists);
router.get('/board/:boardId/lists/archived', listController.getArchivedLists);


// List operations
router.post('/', listController.createList);
router.patch('/:id', listController.updateList);
router.patch('/:id/reorder', listController.reorderList);
router.patch('/:id/archive', listController.archiveList);
router.patch('/:id/restore', listController.restoreList);

module.exports = router;
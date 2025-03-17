const express = require('express');
const boardController = require('../controllers/boardController');
const authController = require('../controllers/authController');

const router = express.Router();

// Public routes
router.get('/join/:token', boardController.acceptInvitation);

// Protect all routes after this middleware
router.use(authController.protect);

// Board creation route
router.route('/').post(boardController.createBoard);

// Board-specific routes
router.route('/:id').get(
  boardController.checkBoardPermission('view_board', {
    path: 'workspace',
    select: 'name type',
  }),
  boardController.getBoardById
);

// Member management routes
router.route('/:id/members').get(
  boardController.checkBoardPermission('view_board', {
    path: 'members.user',
    select: 'name email username',
  }),
  boardController.getBoardMembers
);

// Invitation management routes
router
  .route('/:id/invite')
  .post(
    boardController.checkBoardPermission('manage_members'),
    boardController.inviteMembers
  );

router
  .route('/:id/invitations')
  .get(
    boardController.checkBoardPermission('manage_members'),
    boardController.getPendingInvitations
  );

router
  .route('/:id/invitations/:email')
  .delete(
    boardController.checkBoardPermission('manage_members'),
    boardController.cancelInvitation
  );

// Member removal route
router
  .route('/:id/members/:userId')
  .delete(
    boardController.checkBoardPermission('manage_members'),
    boardController.removeMember
  );

// Board update/archive routes
router
  .route('/user-boards/:id')
  .patch(
    boardController.checkBoardPermission('manage_board'),
    boardController.updateBoard
  );

router
  .route('/user-boards/:id/archive')
  .patch(
    boardController.checkBoardPermission('archive_board'),
    boardController.archiveBoard
  );

router
  .route('/user-boards/:id/restore')
  .patch(
    boardController.checkBoardPermission('archive_board'),
    boardController.restoreBoard
  );

router
  .route('/user-boards/:id')
  .delete(
    boardController.checkBoardPermission('delete_board'),
    boardController.deleteBoard
  );

// Get boards for a specific workspace
router.get(
  '/workspaces/:workspaceId/boards',
  boardController.getWorkspaceBoards
);

// Get archived boards
router.get('/user-boards/archived', boardController.getArchivedBoards);

module.exports = router;

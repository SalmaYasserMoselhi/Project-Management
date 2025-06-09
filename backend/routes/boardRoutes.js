const express = require('express');
const boardController = require('../controllers/boardController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true }); // To access WorkspaceId from parent router

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
    (req, res, next) => {
      if (req.user._id.toString() === req.params.userId) {
        // Allow self-leave without permission check
        return next();
      }
      // Otherwise, require manage_members permission
      return boardController.checkBoardPermission('manage_members')(req, res, next);
    },
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
  .route('/user-boards/:id')
  .delete(
    boardController.checkBoardPermission('delete_board'),
    boardController.deleteBoard
  );

router
  .route('/user-boards/:id/archive')
  .patch(
    boardController.checkBoardPermission('view_board'),
    boardController.archiveBoard
  );

router
  .route('/user-boards/:id/restore')
  .patch(
    boardController.checkBoardPermission('view_board'),
    boardController.restoreBoard
  );

// Get archived boards
router.get('/user-boards/archived', boardController.getArchivedBoards);
router.get('/workspace/:workspaceId/archived', boardController.getWorkspaceArchivedBoards);

// Star/unstar routes
router
  .route('/user-boards/:id/star')
  .patch(
    boardController.checkBoardPermission('view_board'),
    boardController.starBoard
  );

router
  .route('/user-boards/:id/unstar')
  .patch(
    boardController.checkBoardPermission('view_board'),
    boardController.unstarBoard
  );

// Route to get starred boards doesn't need to change as it's already user-specific
router.get('/user-boards/starred', boardController.getMyStarredBoards);

// Get boards for a specific workspace
router.get(
  '/workspace/:workspaceId/boards',
  boardController.getWorkspaceBoards
);

module.exports = router;

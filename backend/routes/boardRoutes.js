const express = require('express');
const boardController = require('../controllers/boardController');
const authController = require('../controllers/authController');

const router = express.Router();

router.get('/join/:token', boardController.acceptInvitation); // Changed from accept-invitation to join
router.use(authController.protect);

router.route('/').post(boardController.createBoard);

router.route('/:id/invite').post(boardController.inviteMemberByEmail);

router.route('/:id/invitations').get(boardController.getPendingInvitations);

router
  .route('/:id/invitations/:email')
  .delete(boardController.cancelInvitation);

router.route('/:id/members/:userId').delete(boardController.removeMember);

router.get('/user-boards', boardController.getUserBoards);
router.get(
  '/workspaces/:workspaceId/boards',
  boardController.getWorkspaceBoards
);
router.get('/user-boards-starred', boardController.getStarredBoards);

router.get('/user-boards/archived', boardController.getArchivedBoards);
router.patch('/user-boards/:id/archive', boardController.archiveBoard);
router.patch('/user-boards/:id/restore', boardController.restoreBoard);
router.delete(
  '/user-boards/:id/permanent',
  boardController.deleteArchivedBoard
);

router.delete('/user-boards/:id', boardController.deleteBoard);

module.exports = router;

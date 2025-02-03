const express = require('express');
const workspaceController = require('../controllers/workspaceController.js');
const authController = require('../controllers/authController.js');
const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Workspace Management Routes
// Get user's workspaces (own and member of)
router.get('/user-workspaces', workspaceController.getUserWorkspaces);

// Get specific workspace
router
  .route('/:workspaceId')
  .get(
    workspaceController.validateWorkspaceOperation,
    workspaceController.getWorkspaceById
  )
  .patch(
    workspaceController.validateWorkspaceOperation,
    workspaceController.updateWorkspace // Only works for public workspace
  );

// Member management routes (only for public workspace)
router
  .route('/:workspaceId/members')
  .get(
    workspaceController.validateWorkspaceOperation,
    workspaceController.getWorkspaceMembers
  );

router
  .route('/:workspaceId/invite')
  .post(
    workspaceController.validateWorkspaceOperation,
    workspaceController.inviteMembers
  )
  .get(
    workspaceController.validateWorkspaceOperation,
    workspaceController.getPendingInvitations
  );

router.delete(
  '/:workspaceId/invite/:email',
  workspaceController.validateWorkspaceOperation,
  workspaceController.cancelInvitation
);

router
  .route('/:workspaceId/members/:userId')
  .delete(
    workspaceController.validateWorkspaceOperation,
    workspaceController.removeMember
  );

router.post(
  '/join/:token',
  authController.protect,
  workspaceController.acceptInvitation
);

module.exports = router;

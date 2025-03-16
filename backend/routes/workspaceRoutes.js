const express = require('express');
const workspaceController = require('../controllers/workspaceController.js');
const authController = require('../controllers/authController.js');
const router = express.Router();

// Public routes
router.get('/join/:token', workspaceController.acceptInvitation);

// Protect all routes after this middleware
router.use(authController.protect);

// General workspace routes
router.get('/user-workspaces', workspaceController.getUserWorkspaces);
router.get('/public-member', workspaceController.getPublicAndMemberWorkspaces);

// Workspace specific routes
router
  .route('/:workspaceId')
  .get(
    workspaceController.checkWorkspacePermission('view_workspace'),
    workspaceController.getWorkspaceById
  )
  .patch(
    workspaceController.checkWorkspacePermission('manage_workspace'),
    workspaceController.checkPublicWorkspace,
    workspaceController.updateWorkspace
  );

// Member management (public workspace only)
router.route('/:workspaceId/members').get(
  workspaceController.checkWorkspacePermission('view_members', {
    path: 'members.user',
    select: 'username email avatar',
  }),
  workspaceController.checkPublicWorkspace,
  workspaceController.getWorkspaceMembers
);

// Invitation management
router
  .route('/:workspaceId/invite')
  .post(
    workspaceController.checkWorkspacePermission('invite_members'),
    workspaceController.checkPublicWorkspace,
    workspaceController.inviteMembers
  )
  .get(
    workspaceController.checkWorkspacePermission('manage_members'),
    workspaceController.checkPublicWorkspace,
    workspaceController.getPendingInvitations
  );

router.delete(
  '/:workspaceId/invite/:email',
  workspaceController.checkWorkspacePermission('manage_members'),
  workspaceController.checkPublicWorkspace,
  workspaceController.cancelInvitation
);

// Member role management
router
  .route('/:workspaceId/members/:userId')
  .delete(
    workspaceController.checkWorkspacePermission('manage_members'),
    workspaceController.checkPublicWorkspace,
    workspaceController.removeMember
  );

module.exports = router;

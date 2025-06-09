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
    // Always load the workspace first
    async (req, res, next) => {
      const Workspace = require('../models/workspaceModel');
      const workspace = await Workspace.findById(req.params.workspaceId);
      if (!workspace) {
        return res.status(404).json({ status: 'error', message: 'Workspace not found' });
      }
      req.workspace = workspace;
      next();
    },
    (req, res, next) => {
      if (req.user._id.toString() === req.params.userId) {
        // Allow self-leave without any permission/public check
        return workspaceController.removeMember(req, res, next);
      }
      // Otherwise, require manage_members permission and public check
      return workspaceController.checkWorkspacePermission('manage_members')(req, res, (err) => {
        if (err) return next(err);
        workspaceController.checkPublicWorkspace(req, res, (err2) => {
          if (err2) return next(err2);
          workspaceController.removeMember(req, res, next);
        });
      });
    }
  );

module.exports = router;

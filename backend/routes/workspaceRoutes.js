const express = require('express');
const workspaceController = require('../controllers/workspaceController.js');
const authController = require('../controllers/authController.js');
const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Get user workspaces with filtering, sorting, and pagination
router.get('/user-workspaces', workspaceController.getUserWorkspaces);

// Get all workspaces for current user
router.get('/all', workspaceController.getAllWorkspaces);

// Create new workspace
router.post(
  '/',
  workspaceController.checkWorkspaceName,
  workspaceController.createWorkspace
);

// Routes that need workspaceId
router
  .route('/:workspaceId')
  .get(
    workspaceController.checkWorkspaceAccess,
    workspaceController.getWorkspaceById
  )
  .patch(
    workspaceController.checkWorkspaceAccess,
    workspaceController.checkWorkspaceAdmin,
    workspaceController.checkWorkspaceName,
    workspaceController.updateWorkspace
  )
  .delete(
    workspaceController.checkWorkspaceAccess,
    workspaceController.checkWorkspaceAdmin,
    workspaceController.deleteWorkspace
  );

// Member management routes
router
  .route('/:workspaceId/members')
  .post(
    workspaceController.checkWorkspaceAccess,
    workspaceController.checkWorkspaceAdmin,
    workspaceController.addMember
  );

router
  .route('/:workspaceId/members/:userId')
  .delete(
    workspaceController.checkWorkspaceAccess,
    workspaceController.checkWorkspaceAdmin,
    workspaceController.removeMember
  );

module.exports = router;

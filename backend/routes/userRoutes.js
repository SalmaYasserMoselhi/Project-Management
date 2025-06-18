const express = require('express');
const passport = require('passport');

const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgotPassword', authController.forgotPassword);
router.post('/verifyResetCode', authController.verifyResetCode);
router.get('/verifyResetSession', authController.verifyResetSession);
router.patch('/resetPassword', authController.resetPassword);

// Google Authentication Routes
router.get('/auth/google', (req, res) => authController.googleAuth(req, res));

router.get(
  '/auth/google/callback',
  (req, res, next) => {
    const frontendUrl = req.query.frontendUrl;
    passport.authenticate('google', {
      failureRedirect: `${frontendUrl}/login`,
      session: false,
    })(req, res, next);
  },
  authController.handleCallback
);

// Github Authentication Routes
router.get('/auth/github', (req, res) => authController.githubAuth(req, res));

router.get(
  '/auth/github/callback',
  (req, res, next) => {
    const frontendUrl = req.query.frontendUrl;
    passport.authenticate('github', {
      failureRedirect: `${frontendUrl}/login`,
      session: false,
    })(req, res, next);
  },
  authController.handleCallback
);

router.get('/verifyEmail/:token', authController.verifyEmail);

router.get('/logout', authController.logout);

// Protect all routes after this middleware
router.patch(
  '/updateMyPassword',
  authController.protect,
  authController.updatePassword
);
router.get(
  '/me',
  authController.protect,
  userController.getMe
  // userController.getUser
);
router.patch(
  '/updateMe',
  userController.uploadUserAvatar,
  userController.resizeUserAvatar,
  authController.protect,
  userController.updateMe
);
router.delete('/deleteMe', authController.protect, userController.deleteMe);
router.get('/search', userController.searchUsers);
router.get(
  '/workspace-users',
  authController.protect,
  userController.searchWorkspaceUsers
);
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);
router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

router.get('/:id/status', userController.getUserStatus);

module.exports = router;

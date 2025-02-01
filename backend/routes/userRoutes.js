const express = require('express');
const passport = require('passport');

const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgotPassword', authController.forgotPassword);
router.post('/verifyResetCode', authController.verifyResetCode);
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
  authController.googleCallback
);

// Github Authentication Routes
router.get(
  '/auth/github',
  passport.authenticate('github', {
    scope: ['user:email', 'read:user'],
  })
);

router.get(
  '/auth/github/callback',
  passport.authenticate('github', {
    failureRedirect: '/login',
    failureMessage: true,
  }),
  authController.githubCallback
);

router.get('/verifyEmail/:token', authController.verifyEmail);

router.get('/logout', authController.logout);

// Protect all routes after this middleware
router.use(authController.protect);
router.patch('/updateMyPassword', authController.updatePassword);
router.get('/me', userController.getMe, userController.getUser);
router.patch('/updateMe', userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);
router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;

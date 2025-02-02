const express = require("express");
const passport = require("passport");

const userController = require("./../controllers/userController");
const authController = require("./../controllers/authController");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/forgotPassword", authController.forgotPassword);
router.post("/verifyResetCode", authController.verifyResetCode);
router.get("/verifyResetSession", authController.verifyResetSession);
router.patch("/resetPassword", authController.resetPassword);

// Google Authentication Routes
router.get("/auth/google", (req, res) => authController.googleAuth(req, res));

router.get(
  "/auth/google/callback",
  (req, res, next) => {
    const frontendUrl = req.query.frontendUrl;
    passport.authenticate("google", {
      failureRedirect: `${frontendUrl}/login`,
      session: false
    })(req, res, next);
  },
  authController.handleCallback
);

// Github Authentication Routes
router.get("/auth/github", (req, res) => authController.githubAuth(req, res));

router.get(
  "/auth/github/callback",
  (req, res, next) => {
    const frontendUrl = req.query.frontendUrl;
    passport.authenticate("github", {
      failureRedirect: `${frontendUrl}/login`,
      session: false
    })(req, res, next);
  },
  authController.handleCallback
);

router.get("/verifyEmail/:token", authController.verifyEmail);

router.get("/logout", authController.logout);

// Protect all routes after this middleware
router.use(authController.protect);
router.patch("/updateMyPassword", authController.updatePassword);
router.get("/me", userController.getMe, userController.getUser);
router.patch("/updateMe", userController.updateMe);
router.delete("/deleteMe", userController.deleteMe);

router
  .route("/")
  .get(userController.getAllUsers)
  .post(userController.createUser);
router
  .route("/:id")
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;

const express = require('express');
const boardController = require('../controllers/boardController');
const authController = require('../controllers/authController');

const router = express.Router();

router.get('/join/:token', boardController.acceptInvitation); // Changed from accept-invitation to join
router.use(authController.protect);

router.route('/').post(boardController.createBoard);

router.route('/:id/invite').post(boardController.inviteMemberByEmail);

router.route('/:id/invitations').get(boardController.getPendingInvitations);
module.exports = router;

const express = require('express');
const meetingController = require('../controllers/meetingController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });

// Protect all routes
router.use(authController.protect);

// User-specific meeting routes (add these before the board-specific routes)
router.get('/my-meetings', meetingController.getUserMeetings);
router.get('/upcoming', meetingController.getUpcomingMeetings);

// Routes for board-specific meetings
router.get('/board/:boardId/meetings', meetingController.getBoardMeetings);

// Meeting CRUD operations
router.route('/')
  .post(meetingController.createMeeting);

router.route('/:id')
  .get(meetingController.getMeeting)
  .patch(meetingController.updateMeeting)
  .delete(meetingController.deleteMeeting);

// Attendee management
router.route('/:id/attendees')
  .post(meetingController.addAttendees);

router.route('/:id/attendees/:userId')
  .delete(meetingController.removeAttendee);

module.exports = router;
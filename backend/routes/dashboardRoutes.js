// In your routes/dashboardRoutes.js
const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.get('/high-priority-tasks', dashboardController.getHighPriorityTasks);

// In your routes/dashboardRoutes.js
router.get('/calendar-deadlines', dashboardController.getCalendarDeadlines);

// In your routes/dashboardRoutes.js
router.get('/activity-log', dashboardController.getActivityLog);


// In your routes/dashboardRoutes.js
router.get('/task-stats', dashboardController.getTaskStats);

module.exports = router;
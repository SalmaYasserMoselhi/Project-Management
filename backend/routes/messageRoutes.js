const express = require('express');
const messageController = require('../controllers/messageController.js');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/', authController.protect, messageController.sendMessage);
router.get('/:convoId', authController.protect, messageController.getMessages);

module.exports = router;

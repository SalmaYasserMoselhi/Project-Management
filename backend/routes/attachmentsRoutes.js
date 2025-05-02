const express = require('express');
const attachmentController = require('../controllers/attachmentController');
const authController = require('../controllers/authController');
const router = express.Router();

// Protect all routes
router.use(authController.protect);

// // Upload files
// router.post(
//   '/upload',
//   attachmentController.uploadAttachments,
//   attachmentController.uploadFiles
// );

// // SPECIFIC ROUTES FIRST
// // Download a file
// router.get('/download/:fileId', attachmentController.downloadFile);

// // Delete a file (permanent delete)
router.delete('/:fileId', attachmentController.deleteFile);

// // Get files for a specific card
// router.get('/card/:cardId', attachmentController.getCardFiles);

module.exports = router;

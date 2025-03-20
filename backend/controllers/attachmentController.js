const fs = require('fs');
const path = require('path');
const Attachment = require('../models/attachmentModel');
const Card = require('../models/cardModel');
const List = require('../models/listModel');
const Board = require('../models/boardModel');
const { uploadMultipleFiles } = require('../Middlewares/fileUploadMiddleware');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const cardController = require('./cardController');

// Helper function to check if a card exists
const checkCardExists = async (cardId) => {
  try {
    const card = await Card.findById(cardId);
    return !!card; // Returns true if card exists
  } catch (error) {
    console.error(`Error checking if card exists:`, error);
    return false;
  }
};

// Helper function to check if user can delete a file
const checkDeletePermission = catchAsync(async (req, file) => {
  // Check if the file was uploaded by the current user
  const isUploader = file.uploadedBy.toString() === req.user._id.toString();

  if (isUploader) {
    // Users can always delete their own uploads
    return true;
  }

  // For card files, check board permissions
  if (file.entityType === 'card') {
    const card = await Card.findById(file.entityId);
    if (!card) return false;

    const list = await List.findById(card.list);
    if (!list) return false;

    const board = await Board.findById(list.board);
    if (!board) return false;

    // Check if user is admin or owner of the board
    const membership = board.members.find(
      (member) => member.user.toString() === req.user._id.toString()
    );

    if (!membership) return false;

    const userRole = membership.role || 'member';
    return ['admin', 'owner'].includes(userRole);
  }

  return false;
});

exports.uploadAttachments = uploadMultipleFiles().array('files', 5);

// Upload files with simplified permission checks
exports.uploadFiles = catchAsync(async (req, res, next) => {
  const { entityType, entityId } = req.body;

  if (!entityType || !entityId) {
    return next(new AppError('Entity type and ID are required', 400));
  }

  // Check if entity type is card (only supported type for now)
  if (entityType !== 'card') {
    return next(new AppError('Only card attachments are supported', 400));
  }

  // Check if files were uploaded
  if (!req.files || req.files.length === 0) {
    return next(new AppError('No files uploaded', 400));
  }

  // Just verify the card exists
  const cardExists = await checkCardExists(entityId);
  if (!cardExists) {
    return next(new AppError('Card not found', 404));
  }

  // Create file records for each uploaded file
  const uploadedFiles = [];

  for (const file of req.files) {
    const newFile = await Attachment.create({
      originalName: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      entityType,
      entityId,
      uploadedBy: req.user._id,
    });

    uploadedFiles.push(newFile);

    // Add activity log for the card
    try {
      const card = await Card.findById(entityId);
      if (card) {
        cardController.logCardActivity(card, 'attachment_added', req.user._id, {
          fileId: newFile._id,
          filename: newFile.originalName,
          size: newFile.formatSize
            ? newFile.formatSize()
            : `${Math.round(newFile.size / 1024)} KB`,
        });

        await card.save();
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  res.status(201).json({
    status: 'success',
    results: uploadedFiles.length,
    data: {
      files: uploadedFiles,
    },
  });
});

// Get files for a card
exports.getCardFiles = catchAsync(async (req, res, next) => {
  const { cardId } = req.params;

  // Just verify the card exists
  const cardExists = await checkCardExists(cardId);
  if (!cardExists) {
    return next(new AppError('Card not found', 404));
  }

  // Get files for this card
  const files = await Attachment.find({
    entityType: 'card',
    entityId: cardId,
  })
    .populate('uploadedBy', 'firstName lastName email avatar username')
    .sort('-createdAt');

  // Add a flag for each file to indicate if the current user can delete it
  const filesWithPermissions = await Promise.all(
    files.map(async (file) => {
      const fileObj = file.toObject();

      // Check if user can delete this file
      const canDelete = await checkDeletePermission(req, file);
      fileObj.canDelete = canDelete;

      return fileObj;
    })
  );

  res.status(200).json({
    status: 'success',
    results: filesWithPermissions.length,
    data: {
      files: filesWithPermissions,
    },
  });
});

// Download a file
exports.downloadFile = catchAsync(async (req, res, next) => {
  const { fileId } = req.params;

  const file = await Attachment.findById(fileId);
  if (!file) {
    return next(new AppError('File not found', 404));
  }

  // For card files, verify the card exists
  if (file.entityType === 'card') {
    const cardExists = await checkCardExists(file.entityId);
    if (!cardExists) {
      return next(new AppError('Card not found', 404));
    }
  }

  // Check if file exists on disk
  if (!fs.existsSync(file.path)) {
    return next(new AppError('File not found on server', 404));
  }

  // Set appropriate headers
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(file.originalName)}"`
  );
  res.setHeader('Content-Type', file.mimetype);
  res.setHeader('Content-Length', file.size);

  // Create read stream and pipe to response
  fs.createReadStream(file.path).pipe(res);
});

// Delete a file (permanent delete with permission checks)
exports.deleteFile = catchAsync(async (req, res, next) => {
  const { fileId } = req.params;

  // Find the file record
  const file = await Attachment.findById(fileId);
  if (!file) {
    return next(new AppError('File not found', 404));
  }

  // Check if user has permission to delete this file
  const canDelete = await checkDeletePermission(req, file);
  if (!canDelete) {
    return next(
      new AppError('You do not have permission to delete this file', 403)
    );
  }

  try {
    // Delete the physical file if it exists
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    } else {
      console.warn(`Physical file not found at path: ${file.path}`);
    }

    // Remove the database record
    await Attachment.findByIdAndDelete(fileId);

    // Log activity for card attachments
    if (file.entityType === 'card') {
      const card = await Card.findById(file.entityId);
      if (card) {
        cardController.logCardActivity(
          card,
          'attachment_removed',
          req.user._id,
          {
            fileId: file._id,
            filename: file.originalName,
            deletedBy: req.user._id,
          }
        );

        await card.save();
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'File deleted successfully',
      data: null,
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return next(new AppError('Error deleting file', 500));
  }
});

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
const permissionService = require('../utils/permissionService');
const notificationService = require('../utils/notificationService');
const activityService = require('../utils/activityService');
// Helper function to get card with its parent list and board
const getCardWithContext = async (cardId) => {
  // Find card and verify it exists
  const card = await Card.findById(cardId);
  if (!card) {
    throw new AppError('Card not found', 404);
  }

  // Find list and verify it exists
  const list = await List.findById(card.list);
  if (!list) {
    throw new AppError('List not found', 404);
  }

  // Find board and verify it exists
  const board = await Board.findById(list.board);
  if (!board) {
    throw new AppError('Board not found', 404);
  }

  return { card, list, board };
};

// Helper function to check if user can delete a file
const checkDeletePermission = async (req, file) => {
  try {
    // Check if the file was uploaded by the current user
    const isUploader = file.uploadedBy.toString() === req.user._id.toString();

    console.log(`File uploader ID: ${file.uploadedBy.toString()}`);
    console.log(`Current user ID: ${req.user._id.toString()}`);
    console.log(`Is uploader: ${isUploader}`);

    // Users can always delete their own uploads
    if (isUploader) {
      return true;
    }

    // For card files, check board permissions using permissionService
    if (file.entityType === 'card') {
      try {
        const { card, list, board } = await getCardWithContext(file.entityId);

        // Check if user is admin or owner using permissionService
        const canManageBoard = permissionService.hasPermission(
          board,
          req.user._id,
          'manage_board'
        );
        console.log(`User has manage_board permission: ${canManageBoard}`);

        return canManageBoard;
      } catch (error) {
        console.error('Error checking board permissions:', error);
        return false;
      }
    }

    return false;
  } catch (error) {
    console.error('Error in checkDeletePermission:', error);
    return false;
  }
};

exports.uploadAttachments = uploadMultipleFiles().array('files', 5);

// Upload files with improved permission checks
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

  // Get card context and verify permissions
  try {
    const { card, list, board } = await getCardWithContext(entityId);

    // Check if user can edit this card using permissionService
    if (!permissionService.canEditCard(board, card, req.user._id)) {
      return next(
        new AppError(
          'You do not have permission to add attachments to this card',
          403
        )
      );
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
        cardController.logCardActivity(card, 'attachment_added', req.user._id, {
          fileId: newFile._id,
          filename: newFile.originalName,
          size: newFile.formatSize
            ? newFile.formatSize()
            : `${Math.round(newFile.size / 1024)} KB`,
        });

        await card.save();
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
  } catch (error) {
    return next(error);
  }
});

// Get files for a card
exports.getCardFiles = catchAsync(async (req, res, next) => {
  const { cardId } = req.params;

  // Get card context and verify permissions
  try {
    const { card, list, board } = await getCardWithContext(cardId);

    // Verify user is a board member and can view the board
    permissionService.verifyPermission(board, req.user._id, 'view_board');

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
  } catch (error) {
    return next(error);
  }
});

// Download a file
exports.downloadFile = catchAsync(async (req, res, next) => {
  const { fileId } = req.params;

  const file = await Attachment.findById(fileId);
  if (!file) {
    return next(new AppError('File not found', 404));
  }

  // For card files, verify permissions
  if (file.entityType === 'card') {
    try {
      const { card, list, board } = await getCardWithContext(file.entityId);

      // Verify user has permission to view the board
      permissionService.verifyPermission(board, req.user._id, 'view_board');
    } catch (error) {
      return next(error);
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

exports.deleteFile = catchAsync(async (req, res, next) => {
  const {fileId } = req.params;

  // Find the file
  const file = await Attachment.findById(fileId);
  if (!file) {
    return next(new AppError('File not found', 404));
  }

  // Check if user has permission to delete this file
  const canDelete = await checkDeletePermission(req, file);
  console.log(`Can delete file: ${canDelete}`);

  if (!canDelete) {
    return next(
      new AppError('You do not have permission to delete this file', 403)
    );
  }

  try {
    // For card attachments, get context for notifications
    if (file.entityType === 'card') {
      try {
        const { card, board } = await getCardWithContext(file.entityId);
        console.log(`Logging activity for card: ${card._id}`);

        // Get all board members to notify - using the pattern that works
        const boardMembers = board.members
          .filter(member => member.user.toString() !== req.user._id.toString());
        
        // Send notifications to board members
        for (const member of boardMembers) {
          await notificationService.createNotification(
            req.app.io,
            member.user,
            req.user._id,
            'attachment_removed',
            'card',
            card._id,
            {
              entityType: 'card',
              entityName: card.title,
              cardId: card._id,
              boardId: board._id,
              boardName: board.name,
              filename: file.originalName,
              fileSize: file.formatSize
                ? file.formatSize()
                : `${Math.round(file.size / 1024)} KB`
            }
          );
        }

        // Log card activity
      await  activityService.logCardActivity(
          board,
          req.user._id,
          'attachment_removed',
          card._id,
          {
            fileId: file._id,
            filename: file.originalName,
            deletedBy: req.user._id,
          }
        );

        await card.save();
        console.log('Card activity logged successfully');
      } catch (activityError) {
        console.error('Error logging card activity:', activityError);
        // Continue with the operation even if activity logging fails
      }
    }

    // Delete the physical file if it exists
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    } else {
      console.warn(`Physical file not found at path: ${file.path}`);
    }

    // Remove the database record
    await Attachment.findByIdAndDelete(fileId);

    res.status(200).json({
      status: 'success',
      message: 'Attachment deleted successfully',
      data: null,
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return next(new AppError('Error deleting file', 500));
  }
});

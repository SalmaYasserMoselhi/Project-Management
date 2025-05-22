const fs = require('fs');
const path = require('path');
const mime = require('mime-types'); // Add this package to your dependencies if not already present
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
// Upload files with improved permission checks
exports.uploadAttachments = catchAsync(async (req, res, next) => {
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

  // DEBUG: Log multer file information
  console.log(
    'Multer files:',
    req.files.map((file) => ({
      originalname: file.originalname,
      filename: file.filename,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
      destination: file.destination,
    }))
  );

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
      // DEBUG: Check if file exists at the path multer provided
      console.log('File upload debug:', {
        originalPath: file.path,
        pathExists: fs.existsSync(file.path),
        resolvedPath: path.resolve(file.path),
        resolvedExists: fs.existsSync(path.resolve(file.path)),
        cwd: process.cwd(),
      });

      // Ensure we have the correct path
      let filePath = file.path;
      if (!fs.existsSync(filePath)) {
        // Try alternative paths
        const alternativePaths = [
          path.resolve(filePath),
          path.join(process.cwd(), filePath),
          path.join(process.cwd(), 'uploads', file.filename),
        ];

        for (const altPath of alternativePaths) {
          if (fs.existsSync(altPath)) {
            filePath = altPath;
            console.log(`Found file at alternative path: ${altPath}`);
            break;
          }
        }

        if (!fs.existsSync(filePath)) {
          console.error('File not found at any expected location:', {
            originalPath: file.path,
            alternatives: alternativePaths,
          });
          return next(new AppError('File upload failed - file not found', 500));
        }
      }

      const newFile = await Attachment.create({
        originalName: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        path: filePath, // Use the verified path
        entityType,
        entityId,
        uploadedBy: req.user._id,
      });

      console.log('File saved to database:', {
        id: newFile._id,
        path: newFile.path,
        pathExists: fs.existsSync(newFile.path),
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

exports.downloadFile = catchAsync(async (req, res, next) => {
  const { fileId } = req.params;

  const file = await Attachment.findById(fileId);
  if (!file) {
    return next(new AppError('File not found', 404));
  }
  console.log('Raw file.path from DB:', file);

  // DEBUG: Log file information
  console.log('File details:', {
    id: file._id,
    originalName: file.originalName,
    path: path.join('uploads', 'attachments', file.filename),
    mimetype: file.mimetype,
    entityType: file.entityType,
    entityId: file.entityId,
  });

  // For card files, verify permissions
  if (file.entityType === 'card') {
    try {
      const { card, list, board } = await getCardWithContext(file.entityId);
      permissionService.verifyPermission(board, req.user._id, 'view_board');
    } catch (error) {
      return next(error);
    }
  } else if (file.entityType === 'chat') {
    try {
      const conversation = await Conversation.findById(file.entityId);
      if (!conversation) {
        return next(new AppError('Conversation not found', 404));
      }

      const isMember = conversation.users.some(
        (userId) => userId.toString() === req.user._id.toString()
      );

      if (!isMember) {
        return next(
          new AppError('You are not a member of this conversation', 403)
        );
      }
    } catch (error) {
      return next(error);
    }
  }

  // ENHANCED: Better path handling and debugging
  const absolutePath = path.join(process.cwd(), file.path);
  console.log('Checking absolute file path:', absolutePath);

  console.log('Path debugging:', {
    originalPath: file.path,
    absolutePath: absolutePath,
    currentWorkingDir: process.cwd(),
    pathExists: fs.existsSync(absolutePath),
  });

  // Try different path variations
  const pathVariations = [
    absolutePath,
    file.path,
    path.join(process.cwd(), file.path),
    path.join(process.cwd(), 'uploads', path.basename(file.path)),
    path.join(__dirname, '..', file.path),
    path.join(__dirname, '..', 'uploads', path.basename(file.path)),
  ];

  let existingPath = null;
  for (const pathVar of pathVariations) {
    console.log(`Trying path: ${pathVar} - Exists: ${fs.existsSync(pathVar)}`);
    if (fs.existsSync(pathVar)) {
      existingPath = pathVar;
      break;
    }
  }

  if (!existingPath) {
    console.error('File not found in any expected location');

    // List files in common directories for debugging
    const commonDirs = [
      path.join(process.cwd(), 'uploads'),
      path.join(__dirname, '..', 'uploads'),
      path.dirname(file.path),
    ];

    for (const dir of commonDirs) {
      if (fs.existsSync(dir)) {
        console.log(`Files in ${dir}:`, fs.readdirSync(dir));
      } else {
        console.log(`Directory does not exist: ${dir}`);
      }
    }

    return next(new AppError('File not found on server', 404));
  }

  console.log(`File found at: ${existingPath}`);

  try {
    const stats = fs.statSync(existingPath);

    // Double-check mimetype based on file extension
    const fileExt = path.extname(existingPath).toLowerCase();
    let detectedMimetype =
      mime.lookup(fileExt) || file.mimetype || 'application/octet-stream';

    // Handle specific file types differently
    if (fileExt === '.png') {
      detectedMimetype = 'image/png';
    } else if (fileExt === '.jpg' || fileExt === '.jpeg') {
      detectedMimetype = 'image/jpeg';
    } else if (fileExt === '.pdf') {
      detectedMimetype = 'application/pdf';
    }

    const encodedFilename = encodeURIComponent(file.originalName)
      .replace(/['()]/g, escape) // Handle special characters
      .replace(/\*/g, '%2A');

    // CRITICAL: Set proper headers
    res.setHeader('Content-Type', detectedMimetype);
    res.setHeader('Content-Length', stats.size);
    // Set appropriate headers
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`
    );

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // ALTERNATIVE APPROACH: Read the entire file and send as a buffer
    // This avoids potential issues with streaming
    const fileBuffer = fs.readFileSync(existingPath);
    console.log('File read successfully, file size:', fileBuffer.length);

    // Send the file directly as a buffer
    return res.send(fileBuffer);
  } catch (err) {
    console.error('Error reading file:', err);
    return next(new AppError('Error reading file from disk', 500));
  }
});

exports.deleteFile = catchAsync(async (req, res, next) => {
  const { fileId } = req.params;

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
        const boardMembers = board.members.filter(
          (member) => member.user.toString() !== req.user._id.toString()
        );

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
                : `${Math.round(file.size / 1024)} KB`,
            }
          );
        }

        // Log card activity
        await activityService.logCardActivity(
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
    const absolutePath = path.resolve(__dirname, '..', '..', file.path);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
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

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const mime = require('mime-types'); // Add this package to your dependencies if not already present
const Attachment = require('../models/attachmentModel');
const Card = require('../models/cardModel');
const List = require('../models/listModel');
const Board = require('../models/boardModel');
const Conversation = require('../models/conversationModel');
const { uploadMultipleFiles, sanitizeFilename } = require('../Middlewares/fileUploadMiddleware');const catchAsync = require('../utils/catchAsync');
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

  try {
    const { card, list, board } = await getCardWithContext(entityId);

    if (!permissionService.canEditCard(board, card, req.user._id)) {
      return next(
        new AppError(
          'You do not have permission to add attachments to this card',
          403
        )
      );
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      const originalName = file.decodedOriginalName || sanitizeFilename(file.originalname);
      const fileSize = parseInt(file.size) || 0;

      let filePath = file.path;
      if (!fs.existsSync(filePath)) {
        const alternativePaths = [
          path.resolve(filePath),
          path.join(process.cwd(), filePath),
          path.join(process.cwd(), 'uploads', 'attachments' , file.filename),
        ];

        for (const altPath of alternativePaths) {
          if (fs.existsSync(altPath)) {
            filePath = altPath;
            console.log(`Found file at alternative path: ${altPath}`);
            break;
          }
        }

        if (!fs.existsSync(filePath)) {
          return next(new AppError('File upload failed - file not found', 500));
        }
      }

      const relativePath = path.relative(process.cwd(), filePath);

      const newFile = await Attachment.create({
        originalName: originalName,
        filename: file.filename,
        mimetype: file.mimetype,
        size: fileSize,
        path: relativePath, // ✅ Store relative path
        entityType,
        entityId,
        uploadedBy: req.user._id,
      });

      uploadedFiles.push(newFile);

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

  // Permission checks (same as before)
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

  const actualFilename = file.filename.includes('http') ?
    path.basename(file.filename) : file.filename;
 
  const filePath = path.join(process.cwd(), 'uploads', 'attachments', actualFilename);

  if (!fs.existsSync(filePath)) {
    console.error(`File not found at: ${filePath}`);
    return next(new AppError('File not found on server', 404));
  }

  try {
    const stats = fs.statSync(filePath);
    const originalName = file.originalName || 'download';
    
    // تحسين معالجة الأسماء العربية
    const safeFilename = sanitizeArabicFilename(originalName);
    
    // تحديد نوع الملف الصحيح
    const mimeType = file.mimeType || file.mimetype || getMimeType(originalName);
    
    // إعداد headers محسنة لدعم الأسماء العربية
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stats.size);
    
    // استخدام طريقة أفضل لـ Content-Disposition مع دعم العربية
    const encodedFilename = encodeURIComponent(safeFilename);
    const asciiFilename = toAsciiFilename(safeFilename);
    
    // إعداد Content-Disposition بطريقة متوافقة مع المتصفحات المختلفة
    res.setHeader('Content-Disposition', 
      `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`);
    
    // Headers إضافية للأمان والتوافق
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    
    // معلومات إضافية للملف
    res.setHeader('X-File-Name', encodedFilename);
    res.setHeader('X-File-Size', stats.size);
    res.setHeader('X-Original-Name', Buffer.from(originalName, 'utf8').toString('base64'));

    // إرسال الملف
    const fileStream = fs.createReadStream(filePath);
   
    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      if (!res.headersSent) {
        return next(new AppError('Error reading file', 500));
      }
    });

    fileStream.pipe(res);
    
  } catch (err) {
    console.error('File access error:', err);
    return next(new AppError('Cannot access file', 500));
  }
});

// دالة لتنظيف أسماء الملفات العربية
function sanitizeArabicFilename(filename) {
  if (!filename) return 'download';
  
  // إزالة الأحرف الخطيرة مع الحفاظ على العربية
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')  // إزالة الأحرف الخطيرة فقط
    .replace(/\s+/g, '_')  // استبدال المسافات بـ underscore
    .replace(/_{2,}/g, '_')  // تقليل عدة underscores إلى واحد
    .trim();
}

// دالة لتحويل الاسم إلى ASCII كبديل للمتصفحات القديمة
function toAsciiFilename(filename) {
  if (!filename) return 'download';
  
  // إنشاء نسخة ASCII بديلة للمتصفحات التي لا تدعم UTF-8
  const asciiName = filename
    .replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, 'file') // استبدال العربية
    .replace(/[^\x00-\x7F]/g, '_') // استبدال أي حرف غير ASCII
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .trim();
    
  return asciiName || 'download';
}

// تحسين دالة getMimeType
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain; charset=utf-8',
    '.csv': 'text/csv; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.wmv': 'video/x-ms-wmv',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.json': 'application/json; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

// فانكشن مساعدة لتحديد نوع الملف
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}


exports.deleteFile = catchAsync(async (req, res, next) => {
  const { fileId } = req.params;

  // Find the file
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
    // For card attachments, get context for notifications
    if (file.entityType === 'card') {
      try {
        const { card, board } = await getCardWithContext(file.entityId);

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
    const pathVariations = [
      path.join(process.cwd(), 'uploads', 'attachments', file.filename),
      path.join(process.cwd(), file.path),
      file.path,
      path.resolve(file.path),
    ];

    for (const pathVar of pathVariations) {
      if (fs.existsSync(pathVar)) {
        fs.unlinkSync(pathVar);
        break;
      }
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

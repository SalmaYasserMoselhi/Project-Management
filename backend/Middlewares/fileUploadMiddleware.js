const multer = require('multer'); // to upload user image
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const AppError = require('./../utils/appError');
const path = require('path');

exports.uploadSingleImage = (fieldName) => {
  const multerStorage = multer.memoryStorage();

  const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
      cb(null, true);
    } else {
      cb(new AppError('Not an image! Please upload only images.', 400), false);
    }
  };

  const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter,
  });

  return upload.single(fieldName);
};

exports.uploadMultipleFiles = () => {
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      // Use absolute path and ensure directory exists
      const uploadDir = path.join(process.cwd(), 'uploads', 'attachments');

      // Create directory if it doesn't exist
      fs.mkdirSync(uploadDir, { recursive: true });

      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const fileName = `attach-${uuidv4()}-${Date.now()}`;
      const ext = path.extname(file.originalname);
      cb(null, `${fileName}${ext}`);
    },
  });


  // IMPROVED: Add proper file type detection
  const fileFilter = (req, file, cb) => {
    // Get the file extension
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Set the correct mimetype based on extension for common types
    // This helps ensure files are served with the right Content-Type
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        file.mimetype = 'image/jpeg';
        break;
      case '.png':
        file.mimetype = 'image/png';
        break;
      case '.gif':
        file.mimetype = 'image/gif';
        break;
      case '.pdf':
        file.mimetype = 'application/pdf';
        break;
      case '.doc':
      case '.docx':
        file.mimetype = 'application/msword';
        break;
      case '.xls':
      case '.xlsx':
        file.mimetype = 'application/vnd.ms-excel';
        break;
      case '.zip':
        file.mimetype = 'application/zip';
        break;
      case '.txt':
        file.mimetype = 'text/plain';
        break;
      // Add more types as needed
    }
    
    cb(null, true);
  };
  const upload = multer({
    storage,
    limits: {
      fieldSize: 10 * 1024 * 1024, // 10MB
      files: 5,
    },
  });

  return upload;
};


// Add this function to properly handle the filename encoding
exports.sanitizeFilename = function(originalname) {
  // Return the untouched originalname - we'll handle encoding at display time
  return originalname;
};
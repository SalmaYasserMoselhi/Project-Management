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

  const upload = multer({
    storage,
    limits: {
      fieldSize: 10 * 1024 * 1024, // 10MB
      files: 5,
    },
  });

  return upload;
};

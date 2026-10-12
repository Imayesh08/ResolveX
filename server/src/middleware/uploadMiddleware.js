const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { MAX_FILE_SIZE, MAX_ATTACHMENTS_PER_COMPLAINT } = require('../utils/fileValidator');

// In-memory buffer storage so files are inspected before persisting to private disk
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_ATTACHMENTS_PER_COMPLAINT
  }
});

/**
 * Express middleware wrapper to catch Multer errors gracefully
 */
const handleUploadError = (uploadMiddleware) => (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            status: 'fail',
            message: `File exceeds the maximum permitted size of ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB.`
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            status: 'fail',
            message: `Cannot upload more than ${MAX_ATTACHMENTS_PER_COMPLAINT} files at once.`
          });
        }
        return res.status(400).json({
          status: 'fail',
          message: `Upload error: ${err.message}`
        });
      }
      return res.status(400).json({
        status: 'fail',
        message: err.message || 'File upload failed.'
      });
    }
    next();
  });
};

// Rate limiter for upload endpoints (prevents DoS via storage flooding)
const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 upload requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Too many upload attempts from this IP. Please try again after 15 minutes.'
  }
});

module.exports = {
  uploadSingle: handleUploadError(upload.single('file')),
  uploadMultiple: handleUploadError(upload.array('files', MAX_ATTACHMENTS_PER_COMPLAINT)),
  uploadRateLimiter
};

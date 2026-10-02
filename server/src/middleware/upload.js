const multer = require('multer');

// Magic byte signatures for allowed image types
const MAGIC_BYTES = {
  'image/jpeg': [
    { offset: 0, bytes: [0xff, 0xd8, 0xff] },
  ],
  'image/png': [
    { offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  ],
  'image/webp': [
    // RIFF....WEBP
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
    { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  ],
};

/**
 * Validate file type by magic bytes (not just MIME from extension).
 * Returns the detected MIME type or null if invalid.
 */
const detectFileType = (buffer) => {
  for (const [mime, signatures] of Object.entries(MAGIC_BYTES)) {
    const allMatch = signatures.every((sig) =>
      sig.bytes.every((byte, i) => buffer[sig.offset + i] === byte)
    );
    if (allMatch) return mime;
  }
  return null;
};

// Multer: memory storage, 5MB limit, max 10 files
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10,
  },
});

// Multer errors are passed to Express' error pipeline, so wrap it when it is
// used on a route in order to return a useful client error instead of a 500.
const portfolioFiles = (req, res, next) => {
  upload.array('photos', 10)(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum size is 5MB per file.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ message: 'Too many files. Maximum 10 files per upload.' });
      }
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  });
};

/**
 * Middleware to validate uploaded files by magic bytes after multer processes them.
 * Attach to routes AFTER multer middleware.
 */
const validateMagicBytes = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  const invalidFiles = [];
  for (const file of req.files) {
    const detectedType = detectFileType(file.buffer);
    if (!detectedType) {
      invalidFiles.push(file.originalname);
    } else {
      // Store detected type for downstream use
      file.detectedMime = detectedType;
    }
  }

  if (invalidFiles.length > 0) {
    return res.status(400).json({
      message: `Invalid file type detected for: ${invalidFiles.join(', ')}. Only JPG, PNG, and WebP are allowed.`,
    });
  }

  next();
};

/**
 * Handle multer errors with friendly messages.
 */
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 5MB per file.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files. Maximum 10 files per upload.' });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  if (err?.message?.includes('Only JPG')) {
    return res.status(400).json({ message: err.message });
  }
  next(err);
};

module.exports = { upload, portfolioFiles, validateMagicBytes, handleMulterError, detectFileType };

const multer = require('multer');

// Limits: images stay small for fast loads, videos get a larger budget
// because even a short clip is much heavier than a photo.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB per photo
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB per video
const MAX_FILES = 10;

// Magic byte signatures for allowed image types
const IMAGE_MAGIC_BYTES = {
  'image/jpeg': [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  'image/png': [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  'image/webp': [
    // RIFF....WEBP
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
    { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  ],
};

// Container signatures for allowed video types.
// mp4/mov: ....ftyp | webm/mkv: EBML header 1A 45 DF A3
const VIDEO_MAGIC_BYTES = {
  'video/mp4': [[0x00, 0x00, 0x00]],
  'video/quicktime': [[0x00, 0x00, 0x00]],
  'video/webm': [[0x1a, 0x45, 0xdf, 0xa3]],
};

const hasFtyp = (buffer) =>
  buffer.length > 12 &&
  buffer.toString('ascii', 4, 8) === 'ftyp' &&
  ['isom', 'iso2', 'mp41', 'mp42', 'M4V ', 'M4VH', 'M4VP', 'qt  '].some((b) =>
    buffer.toString('ascii', 8, 12).includes(b.trim()) || buffer.toString('ascii', 8, 12) === b
  );

const isEbml = (buffer) =>
  buffer.length > 4 &&
  buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;

/**
 * Validate file type by magic bytes (not just MIME from extension).
 * Returns the detected MIME type or null if invalid.
 */
const detectFileType = (buffer) => {
  if (!buffer || buffer.length < 12) return null;
  for (const [mime, signatures] of Object.entries(IMAGE_MAGIC_BYTES)) {
    const allMatch = signatures.every((sig) =>
      sig.bytes.every((byte, i) => buffer[sig.offset + i] === byte)
    );
    if (allMatch) return mime;
  }
  return null;
};

/** Detect video container from magic bytes. Returns mime or null. */
const detectVideoType = (buffer) => {
  if (!buffer || buffer.length < 12) return null;
  if (hasFtyp(buffer)) {
    const brand = buffer.toString('ascii', 8, 12);
    return brand.startsWith('qt') ? 'video/quicktime' : 'video/mp4';
  }
  if (isEbml(buffer)) return 'video/webm';
  return null;
};

const detectMediaType = (buffer) => detectFileType(buffer) || detectVideoType(buffer);

const isVideoMime = (mime) =>
  ['video/mp4', 'video/webm', 'video/quicktime'].includes(mime);

// Multer: memory storage. Global cap = video max; per-type caps enforced below
// so photos still get the strict 5MB limit.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_VIDEO_BYTES,
    files: MAX_FILES,
  },
});

const collectMulterFiles = (req) => {
  if (Array.isArray(req.files)) return req.files;
  if (req.files && typeof req.files === 'object') {
    return Object.values(req.files).flat();
  }
  if (req.file) return [req.file];
  return [];
};

const normalizeMulterFiles = (req) => {
  if (Array.isArray(req.files)) return; // legacy .array() shape
  if (req.files && typeof req.files === 'object') {
    req.files = collectMulterFiles(req);
  }
};

// Multer errors are passed to Express' error pipeline, so wrap it when it is
// used on a route in order to return a useful client error instead of a 500.
const portfolioFiles = (req, res, next) => {
  upload.array('photos', MAX_FILES)(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum size is 5MB per photo, 50MB per video.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ message: 'Too many files. Maximum 10 files per upload.' });
      }
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  });
};

// Accepts photos + videos: fields `photos`, `videos`, or unified `media`.
// Keeps backwards compatibility with the old photo-only `photos` field.
const portfolioMediaFiles = (req, res, next) => {
  upload.fields([
    { name: 'photos', maxCount: MAX_FILES },
    { name: 'videos', maxCount: MAX_FILES },
    { name: 'media', maxCount: MAX_FILES },
  ])(req, res, (err) => {
    normalizeMulterFiles(req);
    if (!err) {
      if (collectMulterFiles(req).length > MAX_FILES) {
        return res.status(400).json({ message: 'Too many files. Maximum 10 files per upload.' });
      }
      return next();
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum size is 5MB per photo, 50MB per video.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ message: 'Too many files. Maximum 10 files per upload.' });
      }
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  });
};

// Single profile-avatar upload with the same size limits and friendly errors.
const avatarFile = (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ message: 'Upload error: ' + err.message });
  });
};

/**
 * Middleware to validate uploaded files by magic bytes after multer processes them.
 * Attach to routes AFTER multer middleware. Image-only (legacy).
 */
const validateMagicBytes = (req, res, next) => {
  const files = collectMulterFiles(req);
  if (files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  const invalidFiles = [];
  for (const file of files) {
    const detectedType = detectMediaType(file.buffer);
    if (!detectedType) {
      invalidFiles.push(file.originalname);
    } else {
      file.detectedMime = detectedType;
    }
    // Enforce per-type size caps (multer only enforces the global 50MB cap)
    const cap = isVideoMime(detectedType) ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > cap) {
      return res.status(400).json({
        message: `${file.originalname}: exceeds ${isVideoMime(detectedType) ? '50MB video' : '5MB photo'} limit.`,
      });
    }
  }

  if (invalidFiles.length > 0) {
    return res.status(400).json({
      message: `Invalid file type detected for: ${invalidFiles.join(', ')}. Only JPG, PNG, WebP photos and MP4, WebM, MOV videos are allowed.`,
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
      return res.status(400).json({ message: 'File too large. Maximum size is 5MB per photo, 50MB per video.' });
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

module.exports = {
  upload,
  portfolioFiles,
  portfolioMediaFiles,
  avatarFile,
  validateMagicBytes,
  handleMulterError,
  detectFileType,
  detectVideoType,
  detectMediaType,
  isVideoMime,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MAX_FILES,
  VIDEO_MAGIC_BYTES,
};

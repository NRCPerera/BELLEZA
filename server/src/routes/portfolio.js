const express = require('express');
const sharp = require('sharp');
const cloudinary = require('../services/cloudinary');
const PortfolioPhoto = require('../models/PortfolioPhoto');
const Staff = require('../models/Staff');
const { authenticate, authorize } = require('../middleware/auth');
const { portfolioMediaFiles, validateMagicBytes, detectMediaType, isVideoMime } = require('../middleware/upload');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// ─── CONSTANTS ──────────────────────────────────────────────────────────────
const MAX_ITEMS_PER_STAFF = 30; // photos + videos combined
const MAX_PHOTOS_PER_STAFF = 30; // kept for backwards-compatible message text
const MAX_VIDEO_DURATION_SEC = 90;
const PORTFOLIO_SELECT =
  'url caption staff service order createdAt mediaType resourceType thumbnailUrl duration bytes width height';

// ─── RATE LIMITING for uploads ──────────────────────────────────────────────
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 upload requests per 15 min
  message: { message: 'Too many uploads. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── HELPER: upload buffer to Cloudinary ────────────────────────────────────
const uploadToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        format: 'webp', // standardize to webp
        quality: 'auto:good',
        transformation: [{ width: 2000, height: 2000, crop: 'limit' }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });

// ─── HELPER: upload video buffer to Cloudinary ──────────────────────────────
// Optimization: cap at 720p, auto quality/format so playback stays light.
// The player gets preload="none" + a poster thumbnail, so the heavy file
// is only fetched after the user presses play.
const uploadVideoToCloudinary = (buffer, folder, filename) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'video',
        // Adaptive-friendly delivery: limit resolution, let Cloudinary pick
        // the best codec/quality per viewer.
        transformation: [
          { width: 1280, height: 720, crop: 'limit' },
          { quality: 'auto:good', fetch_format: 'auto' },
        ],
        eager_async: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });

// First-frame poster so grids never download video bytes until play.
const videoPosterUrl = (publicId) => {
  try {
    return cloudinary.url(publicId, {
      secure: true,
      resource_type: 'video',
      format: 'jpg',
      transformation: [{ width: 600, crop: 'fill', quality: 'auto', start_offset: '1' }],
    });
  } catch {
    return '';
  }
};

// ─── HELPER: resolve staff profile from authenticated user ──────────────────
const resolveStaffProfile = async (req, res, next) => {
  try {
    const staffProfile = await Staff.findOne({ user: req.user._id });
    if (!staffProfile) {
      return res.status(404).json({ message: 'Staff profile not found for this user' });
    }
    req.staffProfile = staffProfile;
    next();
  } catch (error) {
    console.error('Staff profile lookup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

// @route   GET /api/portfolio/recent
// @desc    Get recent portfolio photos across all staff (for landing page)
// @access  Public
router.get('/recent', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 12, 24);

    const photos = await PortfolioPhoto.find()
      .populate('staff', 'name photo')
      .populate('service', 'name category')
      .sort({ createdAt: -1 })
      .limit(limit)
      .select(PORTFOLIO_SELECT);

    res.json(photos);
  } catch (error) {
    console.error('Get recent portfolio error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/portfolio/staff/:staffId
// @desc    Get portfolio photos for a specific staff member (paginated)
// @access  Public
router.get('/staff/:staffId', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const [photos, total] = await Promise.all([
      PortfolioPhoto.find({ staff: req.params.staffId })
        .populate('service', 'name category')
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(PORTFOLIO_SELECT),
      PortfolioPhoto.countDocuments({ staff: req.params.staffId }),
    ]);

    res.json({
      photos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get staff portfolio error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// STAFF ENDPOINTS (all require auth + staff role)
// ══════════════════════════════════════════════════════════════════════════════

// @route   GET /api/staff/me/portfolio
// @desc    Get own portfolio photos
// @access  Staff
router.get(
  '/',
  authenticate,
  authorize('staff'),
  resolveStaffProfile,
  async (req, res) => {
    try {
      const photos = await PortfolioPhoto.find({ staff: req.staffProfile._id })
        .populate('service', 'name category')
        .sort({ order: 1, createdAt: -1 });

      res.json(photos);
    } catch (error) {
      console.error('Get own portfolio error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/staff/me/portfolio
// @desc    Upload portfolio photos and videos (max 30 items combined)
// @access  Staff
router.post(
  '/',
  authenticate,
  authorize('staff'),
  resolveStaffProfile,
  uploadLimiter,
  portfolioMediaFiles,
  validateMagicBytes,
  async (req, res) => {
    try {
      const files = Array.isArray(req.files) ? req.files : [];
      // Check existing count
      const existingCount = await PortfolioPhoto.countDocuments({
        staff: req.staffProfile._id,
      });

      if (existingCount + files.length > MAX_ITEMS_PER_STAFF) {
        return res.status(400).json({
          message: `Portfolio limit reached. You can have up to ${MAX_ITEMS_PER_STAFF} photos + videos combined (currently ${existingCount}).`,
        });
      }

      const folder = `luxe-salon/portfolio/${req.staffProfile._id}`;
      const captions = Array.isArray(req.body.captions)
        ? req.body.captions
        : req.body.captions
        ? [req.body.captions]
        : [];

      const results = [];
      const errors = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const mime = file.detectedMime || detectMediaType(file.buffer) || file.mimetype || '';
        const isVideo = isVideoMime(mime);

        try {
          if (isVideo) {
            const cloudResult = await uploadVideoToCloudinary(file.buffer, folder, file.originalname);

            // Enforce a short-form limit so pages stay fast (90s max)
            if (cloudResult.duration && cloudResult.duration > MAX_VIDEO_DURATION_SEC) {
              await cloudinary.uploader
                .destroy(cloudResult.public_id, { resource_type: 'video' })
                .catch(() => {});
              throw new Error(`Video too long (${Math.round(cloudResult.duration)}s). Max ${MAX_VIDEO_DURATION_SEC}s.`);
            }

            const item = await PortfolioPhoto.create({
              staff: req.staffProfile._id,
              url: cloudResult.secure_url,
              publicId: cloudResult.public_id,
              mediaType: 'video',
              resourceType: 'video',
              thumbnailUrl: videoPosterUrl(cloudResult.public_id),
              duration: cloudResult.duration || 0,
              bytes: cloudResult.bytes || file.size,
              width: cloudResult.width || 0,
              height: cloudResult.height || 0,
              caption: (captions[i] || '').slice(0, 200),
              order: existingCount + i,
            });

            results.push(item);
          } else {
            // Re-encode with sharp: strip EXIF/GPS, convert to webp
            const processedBuffer = await sharp(file.buffer)
              .rotate() // auto-rotate based on EXIF before stripping
              .webp({ quality: 85 })
              .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
              .toBuffer();

            const cloudResult = await uploadToCloudinary(processedBuffer, folder);

            const photo = await PortfolioPhoto.create({
              staff: req.staffProfile._id,
              url: cloudResult.secure_url,
              publicId: cloudResult.public_id,
              mediaType: 'photo',
              resourceType: 'image',
              bytes: cloudResult.bytes || file.size,
              width: cloudResult.width || 0,
              height: cloudResult.height || 0,
              caption: (captions[i] || '').slice(0, 200),
              order: existingCount + i,
            });

            results.push(photo);
          }
        } catch (uploadErr) {
          console.error(`Upload failed for ${file.originalname}:`, uploadErr.message);
          errors.push({ file: file.originalname, error: uploadErr.message });
        }
      }

      res.status(201).json({
        uploaded: results,
        errors,
        message: errors.length > 0
          ? `${results.length} uploaded, ${errors.length} failed`
          : `${results.length} item(s) uploaded successfully`,
      });
    } catch (error) {
      console.error('Portfolio upload error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PATCH /api/staff/me/portfolio/:id
// @desc    Update photo caption and/or order
// @access  Staff
router.patch(
  '/:id([a-fA-F0-9]{24})',
  authenticate,
  authorize('staff'),
  resolveStaffProfile,
  async (req, res) => {
    try {
      const photo = await PortfolioPhoto.findById(req.params.id);

      if (!photo) {
        return res.status(404).json({ message: 'Photo not found' });
      }

      // Ownership check
      if (photo.staff.toString() !== req.staffProfile._id.toString()) {
        return res.status(403).json({ message: 'You can only edit your own photos' });
      }

      // Update only allowed fields
      if (req.body.caption !== undefined) {
        photo.caption = req.body.caption.slice(0, 200);
      }
      if (req.body.order !== undefined) {
        photo.order = parseInt(req.body.order) || 0;
      }
      if (req.body.service !== undefined) {
        photo.service = req.body.service || null;
      }

      await photo.save();
      res.json(photo);
    } catch (error) {
      console.error('Portfolio update error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PATCH /api/staff/me/portfolio/reorder
// @desc    Bulk reorder photos
// @access  Staff
router.patch(
  '/bulk-reorder',
  authenticate,
  authorize('staff'),
  resolveStaffProfile,
  async (req, res) => {
    try {
      const { order } = req.body; // Array of { id, order }
      if (!Array.isArray(order)) {
        return res.status(400).json({ message: 'order must be an array of { id, order }' });
      }

      const bulkOps = order
        .filter((item) => item.id && typeof item.order === 'number')
        .map((item) => ({
          updateOne: {
            filter: { _id: item.id, staff: req.staffProfile._id },
            update: { $set: { order: item.order } },
          },
        }));

      if (bulkOps.length > 0) {
        await PortfolioPhoto.bulkWrite(bulkOps);
      }

      const photos = await PortfolioPhoto.find({ staff: req.staffProfile._id })
        .sort({ order: 1, createdAt: -1 });

      res.json(photos);
    } catch (error) {
      console.error('Portfolio reorder error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   DELETE /api/staff/me/portfolio/:id
// @desc    Delete a portfolio item (DB + Cloudinary)
// @access  Staff
router.delete(
  '/:id([a-fA-F0-9]{24})',
  authenticate,
  authorize('staff'),
  resolveStaffProfile,
  async (req, res) => {
    try {
      const photo = await PortfolioPhoto.findById(req.params.id);

      if (!photo) {
        return res.status(404).json({ message: 'Item not found' });
      }

      // Ownership check
      if (photo.staff.toString() !== req.staffProfile._id.toString()) {
        return res.status(403).json({ message: 'You can only delete your own items' });
      }

      // Delete from Cloudinary (videos need resource_type: 'video')
      if (photo.publicId) {
        try {
          const resourceType = photo.resourceType || (photo.mediaType === 'video' ? 'video' : 'image');
          await cloudinary.uploader.destroy(photo.publicId, { resource_type: resourceType });
        } catch (cloudErr) {
          console.error('Cloudinary delete error:', cloudErr.message);
          // Continue with DB deletion even if Cloudinary fails
        }
      }

      await PortfolioPhoto.findByIdAndDelete(photo._id);

      res.json({ message: 'Item deleted successfully' });
    } catch (error) {
      console.error('Portfolio delete error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;

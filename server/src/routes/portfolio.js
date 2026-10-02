const express = require('express');
const sharp = require('sharp');
const cloudinary = require('../services/cloudinary');
const PortfolioPhoto = require('../models/PortfolioPhoto');
const Staff = require('../models/Staff');
const { authenticate, authorize } = require('../middleware/auth');
const { portfolioFiles, validateMagicBytes } = require('../middleware/upload');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// ─── CONSTANTS ──────────────────────────────────────────────────────────────
const MAX_PHOTOS_PER_STAFF = 30;

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
      .select('url caption staff service createdAt');

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
        .select('url caption service order createdAt'),
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
// @desc    Upload portfolio photos
// @access  Staff
router.post(
  '/',
  authenticate,
  authorize('staff'),
  resolveStaffProfile,
  uploadLimiter,
  portfolioFiles,
  validateMagicBytes,
  async (req, res) => {
    try {
      // Check existing count
      const existingCount = await PortfolioPhoto.countDocuments({
        staff: req.staffProfile._id,
      });

      if (existingCount + req.files.length > MAX_PHOTOS_PER_STAFF) {
        return res.status(400).json({
          message: `Portfolio limit reached. You can have up to ${MAX_PHOTOS_PER_STAFF} photos (currently ${existingCount}).`,
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

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];

        try {
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
            caption: (captions[i] || '').slice(0, 200),
            order: existingCount + i,
          });

          results.push(photo);
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
          : `${results.length} photo(s) uploaded successfully`,
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
// @desc    Delete a portfolio photo (DB + Cloudinary)
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
        return res.status(404).json({ message: 'Photo not found' });
      }

      // Ownership check
      if (photo.staff.toString() !== req.staffProfile._id.toString()) {
        return res.status(403).json({ message: 'You can only delete your own photos' });
      }

      // Delete from Cloudinary
      if (photo.publicId) {
        try {
          await cloudinary.uploader.destroy(photo.publicId);
        } catch (cloudErr) {
          console.error('Cloudinary delete error:', cloudErr.message);
          // Continue with DB deletion even if Cloudinary fails
        }
      }

      await PortfolioPhoto.findByIdAndDelete(photo._id);

      res.json({ message: 'Photo deleted successfully' });
    } catch (error) {
      console.error('Portfolio delete error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;

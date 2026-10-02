const express = require('express');
const { body, validationResult } = require('express-validator');
const Staff = require('../models/Staff');
const PortfolioPhoto = require('../models/PortfolioPhoto');
const { authenticate, authorize } = require('../middleware/auth');

let cloudinary;
try {
  cloudinary = require('../services/cloudinary');
} catch (e) {
  // Cloudinary not configured – portfolio cleanup will be skipped
}

const router = express.Router();

const addPortfolioPreviews = async (staff) => {
  const ids = staff.map((member) => member._id);
  const photos = await PortfolioPhoto.find({ staff: { $in: ids } })
    .sort({ order: 1, createdAt: -1 })
    .select('staff url')
    .lean();
  const byStaff = new Map();
  photos.forEach((photo) => {
    const key = photo.staff.toString();
    const current = byStaff.get(key) || [];
    if (current.length < 3) current.push(photo.url);
    byStaff.set(key, current);
  });
  return staff.map((member) => ({
    ...member.toObject(),
    portfolioPreview: byStaff.get(member._id.toString()) || [],
  }));
};

// @route   GET /api/staff
// @desc    Get all active staff (public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const staff = await Staff.find({ isActive: true }).select('-user');
    res.json(await addPortfolioPreviews(staff));
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/staff/all
// @desc    Get all staff including inactive (admin)
// @access  Admin
router.get('/all', authenticate, authorize('admin'), async (req, res) => {
  try {
    const staff = await Staff.find();
    res.json(staff);
  } catch (error) {
    console.error('Get all staff error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/staff/:id/portfolio
// @desc    Get a staff member's portfolio (public, paginated)
router.get('/:id/portfolio', async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 50);
    const [photos, total] = await Promise.all([
      PortfolioPhoto.find({ staff: req.params.id })
        .populate('service', 'name category')
        .sort({ order: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('url caption service order createdAt'),
      PortfolioPhoto.countDocuments({ staff: req.params.id }),
    ]);
    res.json({ photos, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get staff portfolio error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/staff/:id
// @desc    Get single staff profile
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id).select('-user');
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    res.json(staff);
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/staff
// @desc    Create a staff member
// @access  Admin
router.post(
  '/',
  authenticate,
  authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('Staff name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const existingStaff = await Staff.findOne({ email: req.body.email });
      if (existingStaff) {
        return res.status(400).json({ message: 'Staff member with this email already exists' });
      }

      const staff = await Staff.create(req.body);
      res.status(201).json(staff);
    } catch (error) {
      console.error('Create staff error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/staff/:id
// @desc    Update a staff member
// @access  Admin
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const staff = await Staff.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    res.json(staff);
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/staff/:id
// @desc    Deactivate a staff member and clean up Cloudinary portfolio
// @access  Admin
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    // Clean up portfolio photos from Cloudinary and DB
    try {
      const photos = await PortfolioPhoto.find({ staff: req.params.id });
      if (photos.length > 0 && cloudinary) {
        const deletePromises = photos
          .filter((p) => p.publicId)
          .map((p) => cloudinary.uploader.destroy(p.publicId).catch(console.error));
        await Promise.allSettled(deletePromises);
      }
      await PortfolioPhoto.deleteMany({ staff: req.params.id });
    } catch (cleanupErr) {
      console.error('Portfolio cleanup error:', cleanupErr.message);
      // Don't fail the whole request if cleanup errors
    }

    res.json({ message: 'Staff member deactivated', staff });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

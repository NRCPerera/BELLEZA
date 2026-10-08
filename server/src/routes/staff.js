const express = require('express');
const { body, validationResult } = require('express-validator');
const Staff = require('../models/Staff');
const PortfolioPhoto = require('../models/PortfolioPhoto');
const { syncStaffServices } = require('../services/staffServices');
const { authenticate, authorize } = require('../middleware/auth');
const { audit } = require('../services/auditLog');
const { getOrSet, invalidatePrefix } = require('../services/cache');

const staffFields = (input) => {
  const { name, email, phone, bio, specialties, photo, workingHours, isActive } = input;
  return Object.fromEntries(Object.entries({ name, email, phone, bio, specialties, photo, workingHours, isActive }).filter(([, value]) => value !== undefined));
};

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
    .select('staff url mediaType thumbnailUrl')
    .lean();
  const byStaff = new Map();
  photos.forEach((photo) => {
    const key = photo.staff.toString();
    const current = byStaff.get(key) || [];
    if (current.length < 3) {
      const isVideo = photo.mediaType === 'video' || photo.resourceType === 'video';
      current.push(isVideo && photo.thumbnailUrl ? photo.thumbnailUrl : photo.url);
    }
    byStaff.set(key, current);
  });
  return staff.map((member) => ({
    ...(member.toObject ? member.toObject() : member),
    portfolioPreview: byStaff.get(member._id.toString()) || [],
  }));
};

// @route   GET /api/staff
// @desc    Get all active staff (public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const staff = await getOrSet('public:staff', () => Staff.find({ isActive: true })
      .select('name email phone bio specialties photo workingHours isActive createdAt')
      .lean()
      .then(addPortfolioPreviews), 5 * 60 * 1000);
    res.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    res.json(staff);
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
    const staff = await Staff.find().lean();
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
        .select('url caption service order createdAt mediaType resourceType thumbnailUrl duration bytes width height').lean(),
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
    const staff = await Staff.findById(req.params.id).select('-user').lean();
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

      const staff = await Staff.create(staffFields(req.body));
      await syncStaffServices(staff, req.body.serviceIds);
      audit('admin.staff_created', { actor: req.user._id, targetType: 'staff', targetId: staff._id });
      invalidatePrefix('public:staff');
      invalidatePrefix('public:services');
      invalidatePrefix('availability:');
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
    const { serviceIds } = req.body;
    const staffUpdates = staffFields(req.body);
    const staff = await Staff.findByIdAndUpdate(req.params.id, staffUpdates, {
      new: true,
      runValidators: true,
    });

    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    await syncStaffServices(staff, serviceIds);
    audit('admin.staff_updated', { actor: req.user._id, targetType: 'staff', targetId: staff._id });
    invalidatePrefix('public:staff');
    invalidatePrefix('public:services');
    invalidatePrefix('availability:');
    res.json(staff);
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Server error' });
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
    audit('admin.staff_deactivated', { actor: req.user._id, targetType: 'staff', targetId: staff._id });
    invalidatePrefix('public:staff');
    invalidatePrefix('public:services');
    invalidatePrefix('availability:');

    // Clean up portfolio items from Cloudinary and DB
    try {
      const photos = await PortfolioPhoto.find({ staff: req.params.id });
      if (photos.length > 0 && cloudinary) {
        const deletePromises = photos
          .filter((p) => p.publicId)
          .map((p) =>
            cloudinary.uploader
              .destroy(p.publicId, {
                resource_type: p.resourceType || (p.mediaType === 'video' ? 'video' : 'image'),
              })
              .catch(console.error)
          );
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

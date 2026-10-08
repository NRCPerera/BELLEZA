const express = require('express');
const { body, validationResult } = require('express-validator');
const Service = require('../models/Service');
const { authenticate, authorize } = require('../middleware/auth');
const { audit } = require('../services/auditLog');
const { getOrSet, invalidatePrefix } = require('../services/cache');

const router = express.Router();

// @route   GET /api/services
// @desc    Get all active services (public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const services = await getOrSet('public:services', () => Service.find({ isActive: true })
      .select('name category description durationMinutes price assignedStaff')
      .populate('assignedStaff', 'name specialties photo')
      .sort({ category: 1, name: 1 })
      .lean(), 5 * 60 * 1000);
    res.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    res.json(services);
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/services/all
// @desc    Get all services including inactive (admin)
// @access  Admin
router.get('/all', authenticate, authorize('admin'), async (req, res) => {
  try {
    const services = await Service.find().populate('assignedStaff', 'name specialties photo').lean();
    res.json(services);
  } catch (error) {
    console.error('Get all services error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/services/:id
// @desc    Get single service
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate('assignedStaff', 'name specialties photo').lean();
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json(service);
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/services
// @desc    Create a service
// @access  Admin
router.post(
  '/',
  authenticate,
  authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('Service name is required'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('durationMinutes').isInt({ min: 15 }).withMessage('Duration must be at least 15 minutes'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const service = await Service.create({
        name: req.body.name, category: req.body.category, description: req.body.description || '',
        durationMinutes: req.body.durationMinutes, price: req.body.price,
        assignedStaff: Array.isArray(req.body.assignedStaff) ? req.body.assignedStaff : [],
        isActive: req.body.isActive !== false,
      });
      audit('admin.service_created', { actor: req.user._id, targetType: 'service', targetId: service._id });
      const populated = await service.populate('assignedStaff', 'name specialties photo');
      invalidatePrefix('public:services');
      invalidatePrefix('availability:');
      res.status(201).json(populated);
    } catch (error) {
      console.error('Create service error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/services/:id
// @desc    Update a service
// @access  Admin
router.put('/:id', authenticate, authorize('admin'), [body('name').optional().trim().isLength({ min: 1, max: 100 }), body('category').optional().trim().isLength({ min: 1, max: 100 }), body('durationMinutes').optional().isInt({ min: 15, max: 480 }), body('price').optional().isFloat({ min: 0 }), body('assignedStaff').optional().isArray(), body('assignedStaff.*').optional().isMongoId(), body('isActive').optional().isBoolean()], async (req, res) => {
  const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { name, category, description, durationMinutes, price, assignedStaff, isActive } = req.body;
    const updates = Object.fromEntries(Object.entries({ name, category, description, durationMinutes, price, assignedStaff, isActive }).filter(([, value]) => value !== undefined));
    const service = await Service.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate('assignedStaff', 'name specialties photo');

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    audit('admin.service_updated', { actor: req.user._id, targetType: 'service', targetId: service._id });
    invalidatePrefix('public:services');
    invalidatePrefix('public:staff');
    invalidatePrefix('availability:');
    res.json(service);
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/services/:id
// @desc    Soft delete (deactivate) a service
// @access  Admin
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    audit('admin.service_deactivated', { actor: req.user._id, targetType: 'service', targetId: service._id });
    invalidatePrefix('public:services');
    invalidatePrefix('public:staff');
    invalidatePrefix('availability:');
    res.json({ message: 'Service deactivated', service });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

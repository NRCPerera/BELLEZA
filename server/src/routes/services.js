const express = require('express');
const { body, validationResult } = require('express-validator');
const Service = require('../models/Service');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/services
// @desc    Get all active services (public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const services = await Service.find({ isActive: true }).populate('assignedStaff', 'name specialties photo');
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
    const services = await Service.find().populate('assignedStaff', 'name specialties photo');
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
    const service = await Service.findById(req.params.id).populate('assignedStaff', 'name specialties photo');
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
      const service = await Service.create(req.body);
      const populated = await service.populate('assignedStaff', 'name specialties photo');
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
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('assignedStaff', 'name specialties photo');

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

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

    res.json({ message: 'Service deactivated', service });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

const express = require('express');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const { syncStaffServices } = require('../services/staffServices');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/admin/stats
// @desc    Get dashboard stats
// @access  Admin
router.use(authenticate, authorize('admin'));

router.get('/stats', async (req, res) => {
  try {
    // Today's appointments
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const todayCount = await Appointment.countDocuments({
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $ne: 'cancelled' },
    });

    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalServices = await Service.countDocuments({ isActive: true });
    const totalStaff = await Staff.countDocuments({ isActive: true });

    res.json({
      todayCount,
      totalCustomers,
      totalServices,
      totalStaff,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/customers
// @desc    Get all customers with booking count
// @access  Admin
router.get('/customers', async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' }).sort({ createdAt: -1 });

    const customerData = await Promise.all(
      customers.map(async (customer) => {
        const bookingCount = await Appointment.countDocuments({ customer: customer._id });
        return {
          _id: customer._id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          totalBookings: bookingCount,
          joinDate: customer.createdAt,
        };
      })
    );

    res.json(customerData);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/customers/:id/appointments
// @desc    Get appointment history for a specific customer
// @access  Admin
router.get('/customers/:id/appointments', async (req, res) => {
  try {
    const appointments = await Appointment.find({ customer: req.params.id })
      .populate('staff', 'name photo')
      .populate('service', 'name category durationMinutes price')
      .sort({ date: -1 });

    res.json(appointments);
  } catch (error) {
    console.error('Get customer appointments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/staff-accounts
// @desc    Create a staff login and link it to a new or existing staff profile
// @access  Admin
router.post(
  '/staff-accounts',
  [
    body('staffId').optional().isMongoId().withMessage('Invalid staff profile id'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('staff.email').optional().isEmail().withMessage('Valid staff email is required'),
    body('tempPassword')
      .isLength({ min: 6 })
      .withMessage('Temporary password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let createdUser;

    try {
      const profileData = req.body.staff || req.body;
      let staff;

      if (req.body.staffId) {
        staff = await Staff.findById(req.body.staffId);
        if (!staff) {
          return res.status(404).json({ message: 'Staff member not found' });
        }
        if (staff.user) {
          return res.status(400).json({ message: 'This staff profile already has a login account' });
        }
      } else {
        const { name, email } = profileData;
        if (!name || !email) {
          return res.status(400).json({ message: 'Name and email are required when creating a staff profile' });
        }

        const existingStaff = await Staff.findOne({ email: email.toLowerCase() });
        if (existingStaff) {
          return res.status(400).json({ message: 'Staff member with this email already exists' });
        }
      }

      const email = (req.body.email || staff?.email || profileData.email)?.toLowerCase();
      const name = req.body.name || staff?.name || profileData.name;
      if (!email || !name) {
        return res.status(400).json({ message: 'Name and email are required' });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      createdUser = await User.create({
        name,
        email,
        password: req.body.tempPassword,
        phone: req.body.phone || staff?.phone || profileData.phone || '',
        role: 'staff',
        mustChangePassword: true,
      });

      if (staff) {
        staff.user = createdUser._id;
        await staff.save();
      } else {
        const allowedProfileFields = [
          'name', 'email', 'phone', 'bio', 'specialties', 'photo', 'workingHours', 'isActive',
        ];
        const newProfile = Object.fromEntries(
          allowedProfileFields
            .filter((field) => profileData[field] !== undefined)
            .map((field) => [field, profileData[field]])
        );
        staff = await Staff.create({ ...newProfile, user: createdUser._id });
        await syncStaffServices(staff, profileData.serviceIds);
      }

      res.status(201).json({
        user: {
          id: createdUser._id,
          name: createdUser.name,
          email: createdUser.email,
          role: createdUser.role,
          mustChangePassword: createdUser.mustChangePassword,
        },
        staff,
      });
    } catch (error) {
      if (createdUser) {
        await User.findByIdAndDelete(createdUser._id).catch(console.error);
      }
      console.error('Create staff account error:', error);
      if (error.code === 11000) {
        return res.status(400).json({ message: 'A user or staff account with these details already exists' });
      }
      res.status(error.statusCode || 500).json({ message: error.message || 'Server error' });
    }
  }
);

module.exports = router;

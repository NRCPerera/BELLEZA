const express = require('express');
const Appointment = require('../models/Appointment');
const SlotBlock = require('../models/SlotBlock');
const User = require('../models/User');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const { syncStaffServices } = require('../services/staffServices');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { timeToMinutes, dayBoundsUTC, toDayKey, isValidDayKey } = require('../services/slotUtils');

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
// @desc    Get all customers: guest bookings grouped by phone + legacy registered users
// @access  Admin
router.get('/customers', async (req, res) => {
  try {
    const legacyCustomers = await User.find({ role: 'customer' }).sort({ createdAt: -1 });

    const legacyData = await Promise.all(
      legacyCustomers.map(async (customer) => {
        const bookingCount = await Appointment.countDocuments({ customer: customer._id });
        return {
          _id: customer._id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          totalBookings: bookingCount,
          joinDate: customer.createdAt,
          source: 'registered',
        };
      })
    );

    const guestAgg = await Appointment.aggregate([
      { $match: { guestPhone: { $ne: '' } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$guestPhone',
          name: { $first: '$guestName' },
          email: { $first: '$guestEmail' },
          totalBookings: { $sum: 1 },
          joinDate: { $min: '$createdAt' },
          lastVisit: { $max: '$date' },
        },
      },
      { $sort: { joinDate: -1 } },
    ]);

    const guestData = guestAgg.map((g) => ({
      _id: `guest-${g._id}`,
      name: (g.name || '').trim() || '—',
      email: g.email || '',
      phone: g._id,
      totalBookings: g.totalBookings,
      joinDate: g.joinDate,
      lastVisit: g.lastVisit,
      source: 'guest',
    }));

    res.json([...guestData, ...legacyData.filter((c) => c.totalBookings > 0 || true)]);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/customers/:id/appointments
// @desc    Get appointment history: guest phone lookup (guest-<phone>) or legacy user id
// @access  Admin
router.get('/customers/:id/appointments', async (req, res) => {
  try {
    const { id } = req.params;
    let filter;
    if (id.startsWith('guest-')) {
      filter = { guestPhone: id.replace(/^guest-/, '') };
    } else {
      filter = {
        $or: [{ customer: id }, { guestPhone: id }, { bookingRef: id }],
      };
      if (!id.match(/^[0-9a-fA-F]{24}$/) && !id.startsWith('guest-')) {
        // Non-ObjectId guest lookup (phone passed directly)
        filter = { $or: [{ guestPhone: id }, { bookingRef: id }] };
      }
    }
    const appointments = await Appointment.find(filter)
      .populate('staff', 'name photo')
      .populate('service', 'name category durationMinutes price')
      .sort({ date: -1 });

    res.json(appointments);
  } catch (error) {
    console.error('Get customer appointments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Slot blocks: pause online booking during walk-in rush ────────────────

// @route   GET /api/admin/blocks
// @desc    List pause-blocks, optionally filtered by date/staffId
// @access  Admin
router.get('/blocks', async (req, res) => {
  try {
    const filter = {};
    if (req.query.date) {
      const dayKey = toDayKey(req.query.date);
      filter.$and = [
        { $or: [{ dayKey }, { dayKey: { $exists: false }, date: (() => { const { startOfDay, endOfDay } = dayBoundsUTC(req.query.date); return { $gte: startOfDay, $lte: endOfDay }; })() }] },
      ];
    }
    if (req.query.staffId) filter.staff = req.query.staffId;
    const blocks = await SlotBlock.find(filter)
      .populate('staff', 'name')
      .sort({ dayKey: 1, startTime: 1 });
    res.json(blocks);
  } catch (error) {
    console.error('Get blocks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/blocks
// @desc    Pause online booking for a staff member (or whole salon) + time range
// @access  Admin
router.post(
  '/blocks',
  [
    body('staffId').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid staff id'),
    body('date').notEmpty().withMessage('Date is required'),
    body('startTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Start time must be HH:MM'),
    body('endTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('End time must be HH:MM'),
    body('reason').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { staffId, date, startTime, endTime, reason } = req.body;
      const dayKey = toDayKey(date);
      if (!isValidDayKey(dayKey)) {
        return res.status(400).json({ message: 'Invalid date format (use YYYY-MM-DD)' });
      }
      if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
        return res.status(400).json({ message: 'End time must be after start time' });
      }
      let staff = null;
      if (staffId) {
        staff = await Staff.findById(staffId);
        if (!staff) return res.status(404).json({ message: 'Staff not found' });
      }
      const block = await SlotBlock.create({
        staff: staff ? staff._id : null,
        date: new Date(`${dayKey}T00:00:00Z`),
        dayKey,
        startTime,
        endTime,
        reason: (reason || 'Busy with walk-in customers').slice(0, 200),
        createdBy: req.user._id,
      });
      const populated = await block.populate('staff', 'name');
      res.status(201).json(populated);
    } catch (error) {
      console.error('Create block error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   DELETE /api/admin/blocks/:id
// @desc    Resume online booking (remove a pause-block)
// @access  Admin
router.delete('/blocks/:id', async (req, res) => {
  try {
    const deleted = await SlotBlock.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Block not found' });
    res.json({ message: 'Online booking resumed' });
  } catch (error) {
    console.error('Delete block error:', error);
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
      .isLength({ min: 12 })
      .withMessage('Temporary password must be at least 12 characters'),
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

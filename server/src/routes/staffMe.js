const express = require('express');
const { body, validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const Staff = require('../models/Staff');
const { authenticate, authorize } = require('../middleware/auth');
const { sendStatusUpdateEmail } = require('../services/emailService');

const router = express.Router();

// All routes require staff role
router.use(authenticate, authorize('staff'));

// Middleware: resolve the Staff profile linked to the logged-in User
router.use(async (req, res, next) => {
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
});

// ─── GET /api/staff/me/overview ─────────────────────────────────────────────
// Today's appointments, upcoming count, simple stats
router.get('/overview', async (req, res) => {
  try {
    const staffId = req.staffProfile._id;

    // Today
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const todayAppointments = await Appointment.find({
      staff: staffId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $ne: 'cancelled' },
    })
      .populate('customer', 'name email phone')
      .populate('service', 'name category durationMinutes price')
      .sort({ startTime: 1 });

    // Upcoming (after today, pending or confirmed)
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    const upcomingCount = await Appointment.countDocuments({
      staff: staffId,
      date: { $gte: tomorrow },
      status: { $in: ['pending', 'confirmed'] },
    });

    // Simple stats
    const totalCompleted = await Appointment.countDocuments({
      staff: staffId,
      status: 'completed',
    });

    const totalCancelled = await Appointment.countDocuments({
      staff: staffId,
      status: 'cancelled',
    });

    const totalAll = await Appointment.countDocuments({ staff: staffId });

    res.json({
      todayAppointments,
      todayCount: todayAppointments.length,
      upcomingCount,
      stats: {
        totalCompleted,
        totalCancelled,
        totalAll,
      },
    });
  } catch (error) {
    console.error('Staff overview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/staff/me/appointments ─────────────────────────────────────────
// Own appointments with optional filters: startDate, endDate, status
router.get('/appointments', async (req, res) => {
  try {
    const filter = { staff: req.staffProfile._id };

    // Status filter
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Date range filter
    if (req.query.startDate && req.query.endDate) {
      const start = new Date(req.query.startDate);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(req.query.endDate);
      end.setUTCHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    } else if (req.query.startDate) {
      const start = new Date(req.query.startDate);
      start.setUTCHours(0, 0, 0, 0);
      filter.date = { $gte: start };
    } else if (req.query.endDate) {
      const end = new Date(req.query.endDate);
      end.setUTCHours(23, 59, 59, 999);
      filter.date = { $lte: end };
    }

    const appointments = await Appointment.find(filter)
      .populate('customer', 'name email phone')
      .populate('staff', 'name photo')
      .populate('service', 'name category durationMinutes price')
      .sort({ date: -1, startTime: -1 });

    res.json(appointments);
  } catch (error) {
    console.error('Staff appointments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PATCH /api/staff/me/appointments/:id/status ────────────────────────────
// Update own appointment status. Allowed transitions only.
const ALLOWED_TRANSITIONS = {
  pending: ['confirmed'],
  confirmed: ['completed', 'no-show'],
};

router.patch(
  '/appointments/:id/status',
  [body('status').notEmpty().withMessage('Status is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { status } = req.body;

      const appointment = await Appointment.findById(req.params.id).populate([
        { path: 'customer', select: 'name email phone' },
        { path: 'staff', select: 'name photo' },
        { path: 'service', select: 'name category durationMinutes price' },
      ]);

      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      // Ownership check
      if (appointment.staff._id.toString() !== req.staffProfile._id.toString()) {
        return res.status(403).json({ message: 'You can only update your own appointments' });
      }

      // Transition check
      const allowed = ALLOWED_TRANSITIONS[appointment.status];
      if (!allowed || !allowed.includes(status)) {
        return res.status(400).json({
          message: `Cannot change status from "${appointment.status}" to "${status}". Allowed: ${(allowed || []).join(', ') || 'none'}`,
        });
      }

      appointment.status = status;
      await appointment.save();

      // Trigger status email for known statuses
      if (['confirmed', 'completed'].includes(status)) {
        const emailData = {
          customerName: appointment.customer.name,
          customerEmail: appointment.customer.email,
          serviceName: appointment.service.name,
          staffName: appointment.staff.name,
          date: appointment.date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          startTime: appointment.startTime,
          endTime: appointment.endTime,
        };
        sendStatusUpdateEmail(emailData, status).catch(console.error);
      }

      res.json(appointment);
    } catch (error) {
      console.error('Staff update status error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// ─── GET /api/staff/me/profile ──────────────────────────────────────────────
router.get('/profile', async (req, res) => {
  try {
    res.json(req.staffProfile);
  } catch (error) {
    console.error('Staff get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PATCH /api/staff/me/profile ────────────────────────────────────────────
// Whitelist: bio, specialties, photo (avatar). Working hours are read-only.
router.patch('/profile', async (req, res) => {
  try {
    const allowedFields = ['bio', 'specialties', 'photo'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const updated = await Staff.findByIdAndUpdate(
      req.staffProfile._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json(updated);
  } catch (error) {
    console.error('Staff update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

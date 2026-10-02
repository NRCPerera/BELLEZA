const express = require('express');
const { body, validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const { authenticate, authorize } = require('../middleware/auth');
const { sendBookingConfirmation, sendStatusUpdateEmail } = require('../services/emailService');

const router = express.Router();

// Helper: convert "HH:MM" to minutes since midnight
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper: convert minutes since midnight to "HH:MM"
const minutesToTime = (mins) => {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

// @route   GET /api/appointments/slots
// @desc    Get available time slots for a staff member on a date
// @access  Public
router.get('/slots', async (req, res) => {
  try {
    const { staffId, date, serviceId } = req.query;

    if (!staffId || !date || !serviceId) {
      return res.status(400).json({ message: 'staffId, date, and serviceId are required' });
    }

    // Get staff working hours
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Get service duration
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Determine day of week
    const dateObj = new Date(date);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[dateObj.getUTCDay()];

    // Find working hours for that day
    const dayHours = staff.workingHours.find(
      (wh) => wh.day.toLowerCase() === dayName.toLowerCase()
    );

    if (!dayHours) {
      return res.json([]); // Staff doesn't work this day
    }

    const startMinutes = timeToMinutes(dayHours.start);
    const endMinutes = timeToMinutes(dayHours.end);
    const durationMinutes = service.durationMinutes;

    // Generate all possible 30-minute slots
    const allSlots = [];
    for (let t = startMinutes; t + durationMinutes <= endMinutes; t += 30) {
      allSlots.push(minutesToTime(t));
    }

    // Get existing appointments for this staff on this date
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const existingAppointments = await Appointment.find({
      staff: staffId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $ne: 'cancelled' },
    });

    // Filter out slots that overlap with existing bookings
    const availableSlots = allSlots.filter((slotTime) => {
      const slotStart = timeToMinutes(slotTime);
      const slotEnd = slotStart + durationMinutes;

      return !existingAppointments.some((apt) => {
        const aptStart = timeToMinutes(apt.startTime);
        const aptEnd = timeToMinutes(apt.endTime);
        // Check overlap
        return slotStart < aptEnd && slotEnd > aptStart;
      });
    });

    res.json(availableSlots);
  } catch (error) {
    console.error('Get slots error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/appointments
// @desc    Get appointments (admin: all, customer: own)
// @access  Private
router.get('/', authenticate, authorize('customer', 'admin'), async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'customer') {
      filter.customer = req.user._id;
    }

    // Optional filters for admin
    if (req.user.role === 'admin') {
      if (req.query.status) filter.status = req.query.status;
      if (req.query.staffId) filter.staff = req.query.staffId;
      if (req.query.date) {
        const startOfDay = new Date(req.query.date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(req.query.date);
        endOfDay.setUTCHours(23, 59, 59, 999);
        filter.date = { $gte: startOfDay, $lte: endOfDay };
      }
      if (req.query.startDate && req.query.endDate) {
        const start = new Date(req.query.startDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(req.query.endDate);
        end.setUTCHours(23, 59, 59, 999);
        filter.date = { $gte: start, $lte: end };
      }
    }

    const appointments = await Appointment.find(filter)
      .populate('customer', 'name email phone')
      .populate('staff', 'name photo')
      .populate('service', 'name category durationMinutes price')
      .sort({ date: -1, startTime: -1 });

    res.json(appointments);
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/appointments
// @desc    Create a booking
// @access  Private
router.post(
  '/',
  authenticate,
  authorize('customer'),
  [
    body('serviceId').notEmpty().withMessage('Service is required'),
    body('staffId').notEmpty().withMessage('Staff is required'),
    body('date').notEmpty().withMessage('Date is required'),
    body('startTime')
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .withMessage('Start time must be in HH:MM format'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { serviceId, staffId, date, startTime, notes } = req.body;

      // Get service duration
      const service = await Service.findById(serviceId);
      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }

      // Calculate end time
      const startMinutes = timeToMinutes(startTime);
      const endMinutes = startMinutes + service.durationMinutes;
      const endTime = minutesToTime(endMinutes);

      // Check if slot is still available
      const dateObj = new Date(date);
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const conflicting = await Appointment.findOne({
        staff: staffId,
        date: { $gte: startOfDay, $lte: endOfDay },
        status: { $ne: 'cancelled' },
        $or: [
          {
            $expr: {
              $and: [
                { $lt: [{ $toInt: { $substr: ['$startTime', 0, 2] } }, Math.floor(endMinutes / 60)] },
                { $gt: [{ $toInt: { $substr: ['$endTime', 0, 2] } }, Math.floor(startMinutes / 60)] },
              ],
            },
          },
        ],
      });

      // Simple overlap check
      const existingAppointments = await Appointment.find({
        staff: staffId,
        date: { $gte: startOfDay, $lte: endOfDay },
        status: { $ne: 'cancelled' },
      });

      const hasConflict = existingAppointments.some((apt) => {
        const aptStart = timeToMinutes(apt.startTime);
        const aptEnd = timeToMinutes(apt.endTime);
        return startMinutes < aptEnd && endMinutes > aptStart;
      });

      if (hasConflict) {
        return res.status(400).json({ message: 'This time slot is no longer available' });
      }

      const appointment = await Appointment.create({
        customer: req.user._id,
        staff: staffId,
        service: serviceId,
        date: dateObj,
        startTime,
        endTime,
        notes: notes || '',
        status: 'pending',
      });

      const populated = await appointment.populate([
        { path: 'customer', select: 'name email phone' },
        { path: 'staff', select: 'name photo' },
        { path: 'service', select: 'name category durationMinutes price' },
      ]);

      // Send confirmation email (async, don't block response)
      const emailData = {
        customerName: populated.customer.name,
        customerEmail: populated.customer.email,
        serviceName: populated.service.name,
        staffName: populated.staff.name,
        date: dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        startTime,
        endTime,
      };
      sendBookingConfirmation(emailData).catch(console.error);

      res.status(201).json(populated);
    } catch (error) {
      console.error('Create appointment error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/appointments/:id/status
// @desc    Update appointment status (admin only)
// @access  Admin
router.put('/:id/status', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate([
      { path: 'customer', select: 'name email phone' },
      { path: 'staff', select: 'name photo' },
      { path: 'service', select: 'name category durationMinutes price' },
    ]);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Send status update email
    if (['confirmed', 'cancelled', 'completed'].includes(status)) {
      const emailData = {
        customerName: appointment.customer.name,
        customerEmail: appointment.customer.email,
        serviceName: appointment.service.name,
        staffName: appointment.staff.name,
        date: appointment.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        startTime: appointment.startTime,
        endTime: appointment.endTime,
      };
      sendStatusUpdateEmail(emailData, status).catch(console.error);
    }

    res.json(appointment);
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/appointments/:id/cancel
// @desc    Cancel appointment (customer cancels own, or admin)
// @access  Private
router.put('/:id/cancel', authenticate, authorize('customer', 'admin'), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id).populate([
      { path: 'customer', select: 'name email phone' },
      { path: 'staff', select: 'name photo' },
      { path: 'service', select: 'name category durationMinutes price' },
    ]);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Customer can only cancel their own
    if (req.user.role === 'customer' && appointment.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this appointment' });
    }

    // Can only cancel pending or confirmed
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      return res.status(400).json({ message: 'Cannot cancel this appointment' });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    // Send cancellation email
    const emailData = {
      customerName: appointment.customer.name,
      customerEmail: appointment.customer.email,
      serviceName: appointment.service.name,
      staffName: appointment.staff.name,
      date: appointment.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      startTime: appointment.startTime,
      endTime: appointment.endTime,
    };
    sendStatusUpdateEmail(emailData, 'cancelled').catch(console.error);

    res.json(appointment);
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

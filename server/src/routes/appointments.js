const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const Appointment = require('../models/Appointment');
const BookingLock = require('../models/BookingLock');
const SlotBlock = require('../models/SlotBlock');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const { authenticate, authorize } = require('../middleware/auth');
const { sendBookingConfirmation, sendStatusUpdateEmail } = require('../services/emailService');
const { timeToMinutes, overlapsRange, dayBoundsUTC, isPastDate, toDayKey, isValidDayKey, isPastSlotToday } = require('../services/slotUtils');

const router = express.Router();

// Public booking throttle: protects from spam/bots
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many booking attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public track-link lookup throttle: magic link is view-only, still rate-limited
const trackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { message: 'Too many lookup attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generateBookingRef = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i += 1) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `BZ-${suffix}`;
};

const resolveContact = (appointment) => {
  const name = appointment.guestName || appointment.customer?.name || '';
  const phone = appointment.guestPhone || appointment.customer?.phone || '';
  const email = appointment.guestEmail || appointment.customer?.email || '';
  return { name, phone, email };
};

// Normalize LK numbers to 947XXXXXXXX (no +) for phone validation
const normalizeRecipient = (raw) => {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) {
    digits = `94${digits.slice(1)}`;
  } else if (digits.length === 9) {
    digits = `94${digits}`;
  }
  return digits;
};

// Helper: convert minutes since midnight to "HH:MM"
const minutesToTime = (mins) => {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

// Fetch blocks applying to a staff member on a date (own + salon-wide)
// Uses dayKey (timezone-safe); falls back to legacy UTC date-range docs without dayKey.
const getBlocksForDay = async (staffId, dayKey, dateInput) => {
  const staffCond = { $or: [{ staff: staffId }, { staff: null }] };
  const byKey = await SlotBlock.find({ dayKey, ...staffCond }).populate('staff', 'name');
  if (dateInput) {
    const { startOfDay, endOfDay } = dayBoundsUTC(dateInput);
    const legacy = await SlotBlock.find({
      dayKey: { $exists: false },
      date: { $gte: startOfDay, $lte: endOfDay },
      ...staffCond,
    }).populate('staff', 'name');
    return [...byKey, ...legacy];
  }
  return byKey;
};

// Same fallback for appointments (pre-dayKey docs)
const getAppointmentsForDay = (staffId, dayKey, dateInput, extra = {}) => {
  const staffCond = staffId ? { staff: staffId } : {};
  if (!dateInput) {
    return Appointment.find({ dayKey, ...staffCond, ...extra });
  }
  const { startOfDay, endOfDay } = dayBoundsUTC(dateInput);
  return Appointment.find({
    $and: [
      { $or: [{ dayKey }, { dayKey: { $exists: false }, date: { $gte: startOfDay, $lte: endOfDay } }] },
      staffCond,
      extra,
    ],
  });
};

// Serialize concurrent booking writes per staff-day (works across instances)
const legacyWithBookingLock = async (staffId, dayKey, fn) => {
  const key = `booking:${staffId}:${dayKey}`;
  const expiresAt = new Date(Date.now() + 10000);
  try {
    await BookingLock.create({ key, expiresAt });
  } catch (err) {
    if (err.code === 11000) {
      // Another request holds the lock — brief wait then proceed to re-check
      await new Promise((r) => setTimeout(r, 150 + Math.floor(Math.random() * 150)));
    } else {
      throw err;
    }
  }
  try {
    return await fn();
  } finally {
    await BookingLock.deleteOne({ key }).catch(() => {});
  }
};

const withBookingLock = async (staffId, dayKey, fn) => {
  const key = `booking:${staffId}:${dayKey}`;
  let acquired = false;
  for (let attempt = 0; attempt < 20 && !acquired; attempt += 1) {
    try {
      await BookingLock.create({ key, expiresAt: new Date(Date.now() + 10000) });
      acquired = true;
    } catch (err) {
      if (err.code !== 11000) throw err;
      await new Promise((resolve) => setTimeout(resolve, 100 + Math.floor(Math.random() * 100)));
    }
  }
  if (!acquired) {
    const err = new Error('Booking is busy. Please try again.');
    err.statusCode = 429;
    throw err;
  }
  try {
    return await fn();
  } finally {
    await BookingLock.deleteOne({ key }).catch(() => {});
  }
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// @route   GET /api/appointments/slots
// @desc    Get available time slots for a staff member on a date
// @access  Public
router.get('/slots', async (req, res) => {
  try {
    const { staffId, date, serviceId } = req.query;

    if (!staffId || !date || !serviceId) {
      return res.status(400).json({ message: 'staffId, date, and serviceId are required' });
    }
    if (!isValidObjectId(staffId) || !isValidObjectId(serviceId)) {
      return res.status(400).json({ message: 'Invalid staff or service' });
    }
    const dayKey = toDayKey(date);
    if (!isValidDayKey(dayKey)) {
      return res.status(400).json({ message: 'Invalid date format (use YYYY-MM-DD)' });
    }

    // Get staff working hours
    const staff = await Staff.findById(staffId);
    if (!staff || staff.isActive === false) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Get service duration
    const service = await Service.findById(serviceId);
    if (!service || service.isActive === false) {
      return res.status(404).json({ message: 'Service not found' });
    }
    const assigned = (service.assignedStaff || []).some(
      (id) => String(id._id || id) === String(staff._id)
    );
    if (!assigned) {
      return res.json([]); // Staff doesn't offer this service
    }

    if (isPastDate(dayKey)) {
      return res.json([]);
    }

    // Determine day of week from calendar dayKey (timezone-safe)
    const dateObj = new Date(`${dayKey}T00:00:00Z`);
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
    const existingAppointments = await getAppointmentsForDay(staffId, dayKey, date, {
      status: { $ne: 'cancelled' },
    });

    // Get admin blocks (walk-in rush) for this staff + salon-wide
    const blocks = await getBlocksForDay(staffId, dayKey, date);

    // Filter out slots that overlap with existing bookings or blocks
    const availableSlots = allSlots.filter((slotTime) => {
      // Hide same-day slots that already passed (30-min prep buffer)
      if (isPastSlotToday(dayKey, slotTime)) return false;
      const slotStart = timeToMinutes(slotTime);
      const slotEnd = slotStart + durationMinutes;

      const booked = existingAppointments.some((apt) => {
        const aptStart = timeToMinutes(apt.startTime);
        const aptEnd = timeToMinutes(apt.endTime);
        // Check overlap
        return overlapsRange(slotStart, slotEnd, aptStart, aptEnd);
      });
      if (booked) return false;

      return !blocks.some((b) => overlapsRange(slotStart, slotEnd, b.startTime, b.endTime));
    });

    res.json(availableSlots);
  } catch (error) {
    console.error('Get slots error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/appointments/track/:bookingRef
// @desc    Public view-only magic-link lookup (no login). Returns masked contact.
// @access  Public
router.get('/track/:bookingRef', trackLimiter, async (req, res) => {
  try {
    const ref = String(req.params.bookingRef || '').trim().toUpperCase();
    if (!/^BZ-[A-Z2-9]{6}$/.test(ref)) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    const appointment = await Appointment.findOne({ bookingRef: ref }).populate([
      { path: 'staff', select: 'name photo' },
      { path: 'service', select: 'name category durationMinutes price' },
    ]);
    if (!appointment) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    const phone = appointment.guestPhone || appointment.customer?.phone || '';
    const maskedPhone = phone.length >= 5 ? `${phone.slice(0, 4)}***${phone.slice(-3)}` : '—';
    res.json({
      bookingRef: appointment.bookingRef,
      guestName: appointment.guestName || appointment.customer?.name || '',
      phoneMasked: maskedPhone,
      service: appointment.service,
      staff: appointment.staff,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
    });
  } catch (error) {
    console.error('Track booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/appointments/blocks
// @desc    Public read of pause-blocks for a staff/date (so staff pages + booking UI can show "paused")
// @access  Public
router.get('/blocks', trackLimiter, async (req, res) => {
  try {
    const { staffId, date } = req.query;
    if (!staffId || !date) {
      return res.status(400).json({ message: 'staffId and date are required' });
    }
    const blocks = await getBlocksForDay(staffId, date);
    res.json(blocks.map((b) => ({
      _id: b._id,
      staff: b.staff,
      staffId: b.staff?._id || null,
      salonWide: !b.staff,
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      reason: b.reason,
    })));
  } catch (error) {
    console.error('Get blocks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/appointments
// @desc    Get appointments (admin only - customer login removed)
// @access  Admin
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    let filter = {};

    // Optional filters for admin (dayKey is timezone-safe YYYY-MM-DD)
    if (req.query.status) filter.status = req.query.status;
    if (req.query.staffId) filter.staff = req.query.staffId;
    if (req.query.date) {
      const dayKey = toDayKey(req.query.date);
      filter.$and = [
        ...(filter.$and || []),
        { $or: [{ dayKey }, { dayKey: { $exists: false }, date: (() => { const { startOfDay, endOfDay } = dayBoundsUTC(req.query.date); return { $gte: startOfDay, $lte: endOfDay }; })() }] },
      ];
    }
    if (req.query.startDate && req.query.endDate) {
      const startKey = toDayKey(req.query.startDate);
      const endKey = toDayKey(req.query.endDate);
      filter.dayKey = { $gte: startKey, $lte: endKey };
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
// @desc    Create a guest booking (no login - mobile number is the identity)
// @access  Public
router.post(
  '/',
  bookingLimiter,
  [
    body('serviceId').isMongoId().withMessage('Valid service is required'),
    body('staffId').isMongoId().withMessage('Valid staff is required'),
    body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be YYYY-MM-DD'),
    body('startTime')
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .withMessage('Start time must be in HH:MM format'),
    body('guestName').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name too long'),
    body('guestPhone').trim().notEmpty().withMessage('Mobile number is required'),
    body('guestEmail').optional({ checkFalsy: true }).isEmail().withMessage('Valid email is required'),
    body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes too long'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { serviceId, staffId, date, startTime, notes, guestName, guestEmail } = req.body;
      const dayKey = toDayKey(date);
      if (!isValidDayKey(dayKey)) {
        return res.status(400).json({ message: 'Invalid date format (use YYYY-MM-DD)' });
      }
      // Enforce 30-minute grid so bookings always align with displayed slots
      if (timeToMinutes(startTime) % 30 !== 0) {
        return res.status(400).json({ message: 'Start time must be on a 30-minute slot (e.g. 10:00, 10:30)' });
      }
      const guestPhone = normalizeRecipient(req.body.guestPhone);
      if (!/^94[1-9]\d{8}$/.test(guestPhone)) {
        return res.status(400).json({ message: 'Enter a valid Sri Lankan mobile number' });
      }

      // Get service + staff, enforce active + assignment guards
      const service = await Service.findById(serviceId);
      if (!service || service.isActive === false) {
        return res.status(404).json({ message: 'Service not found' });
      }
      if (!Number.isInteger(service.durationMinutes) || service.durationMinutes < 15 || service.durationMinutes > 480) {
        return res.status(400).json({ message: 'Service duration is invalid' });
      }
      const staffMember = await Staff.findById(staffId);
      if (!staffMember || staffMember.isActive === false) {
        return res.status(404).json({ message: 'Staff not found' });
      }
      const assigned = (service.assignedStaff || []).some(
        (id) => String(id._id || id) === String(staffMember._id)
      );
      if (!assigned) {
        return res.status(400).json({ message: 'This staff member does not offer the selected service' });
      }

      if (isPastDate(dayKey)) {
        return res.status(400).json({ message: 'Cannot book a past date' });
      }
      if (isPastSlotToday(dayKey, startTime)) {
        return res.status(400).json({ message: 'This time slot has already passed today' });
      }

      // Must fall inside staff working hours for that weekday
      const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(`${dayKey}T00:00:00Z`).getUTCDay()];
      const dayHours = (staffMember.workingHours || []).find(
        (wh) => String(wh.day).toLowerCase() === weekday.toLowerCase()
      );
      if (!dayHours) {
        return res.status(400).json({ message: 'Staff does not work on this day' });
      }

      // Calculate end time
      const startMinutes = timeToMinutes(startTime);
      const endMinutes = startMinutes + service.durationMinutes;
      const endTime = minutesToTime(endMinutes);
      if (endMinutes > 24 * 60) {
        return res.status(400).json({ message: 'Service ends after midnight — pick an earlier slot' });
      }

      if (startMinutes < timeToMinutes(dayHours.start) || endMinutes > timeToMinutes(dayHours.end)) {
        return res.status(400).json({ message: 'Selected time is outside staff working hours' });
      }

      const dateObj = new Date(`${dayKey}T00:00:00Z`);

      // Serialised conflict + block check + create (fixes concurrent double-booking)
      let populated;
      let bookingRef;
      try {
        populated = await withBookingLock(staffId, dayKey, async () => {
          const existingAppointments = await getAppointmentsForDay(staffId, dayKey, date, {
            status: { $ne: 'cancelled' },
          });

          const hasConflict = existingAppointments.some((apt) => {
            const aptStart = timeToMinutes(apt.startTime);
            const aptEnd = timeToMinutes(apt.endTime);
            return overlapsRange(startMinutes, endMinutes, aptStart, aptEnd);
          });

          if (hasConflict) {
            const err = new Error('This time slot is no longer available');
            err.statusCode = 400;
            throw err;
          }

          // Admin pause-block check (walk-in rush): own + salon-wide blocks
          const blocks = await getBlocksForDay(staffId, dayKey, date);
          const blocked = blocks.find((b) => overlapsRange(startMinutes, endMinutes, b.startTime, b.endTime));
          if (blocked) {
            const err = new Error('Online booking is paused for this time. Please try another slot or call the salon.');
            err.statusCode = 400;
            throw err;
          }

          let ref = generateBookingRef();
          for (let i = 0; i < 5; i += 1) {
            const exists = await Appointment.findOne({ bookingRef: ref });
            if (!exists) break;
            ref = generateBookingRef();
          }

          let created;
          try {
            created = await Appointment.create({
              guestName: String(guestName).trim(),
              guestPhone,
              guestEmail: (guestEmail || '').trim().toLowerCase(),
              bookingRef: ref,
              staff: staffId,
              service: serviceId,
              date: dateObj,
              dayKey,
              startTime,
              endTime,
              notes: (notes || '').slice(0, 500),
              status: 'pending',
            });
          } catch (createErr) {
            if (createErr.code === 11000 && createErr.keyPattern?.bookingRef) {
              // bookingRef collision — single retry with fresh ref
              created = await Appointment.create({
                guestName: String(guestName).trim(),
                guestPhone,
                guestEmail: (guestEmail || '').trim().toLowerCase(),
                bookingRef: generateBookingRef(),
                staff: staffId,
                service: serviceId,
                date: dateObj,
                dayKey,
                startTime,
                endTime,
                notes: (notes || '').slice(0, 500),
                status: 'pending',
              });
            } else {
              throw createErr;
            }
          }

          bookingRef = created.bookingRef;
          return created.populate([
            { path: 'staff', select: 'name photo' },
            { path: 'service', select: 'name category durationMinutes price' },
          ]);
        });
      } catch (lockErr) {
        if (lockErr.statusCode === 400) {
          return res.status(400).json({ message: lockErr.message });
        }
        throw lockErr;
      }

      const dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      console.log(`[booking ${bookingRef}] created (phone: ${guestPhone})`);

      // Email confirmation if guest provided an email
      if (populated.guestEmail) {
        sendBookingConfirmation({
          customerName: populated.guestName,
          customerEmail: populated.guestEmail,
          serviceName: populated.service.name,
          staffName: populated.staff.name,
          date: dateLabel,
          startTime,
          endTime,
          bookingRef: populated.bookingRef,
        }).catch(console.error);
      }

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

    // Email status update (guest phone is identity, legacy customer fallback)
    if (['confirmed', 'cancelled', 'completed'].includes(status)) {
      const contact = resolveContact(appointment);
      const dateLabel = appointment.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      if (contact.email) {
        const emailData = {
          customerName: contact.name,
          customerEmail: contact.email,
          serviceName: appointment.service.name,
          staffName: appointment.staff.name,
          date: dateLabel,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          bookingRef: appointment.bookingRef,
        };
        sendStatusUpdateEmail(emailData, status).catch(console.error);
      }
    }

    res.json(appointment);
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/appointments/:id/cancel
// @desc    Cancel appointment (admin only - customer login removed, guests call salon)
// @access  Admin
router.put('/:id/cancel', authenticate, authorize('admin'), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id).populate([
      { path: 'customer', select: 'name email phone' },
      { path: 'staff', select: 'name photo' },
      { path: 'service', select: 'name category durationMinutes price' },
    ]);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Can only cancel pending or confirmed
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      return res.status(400).json({ message: 'Cannot cancel this appointment' });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    // Email cancellation
    const contact = resolveContact(appointment);
    if (contact.email) {
      const emailData = {
        customerName: contact.name,
        customerEmail: contact.email,
        serviceName: appointment.service.name,
        staffName: appointment.staff.name,
        date: appointment.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        bookingRef: appointment.bookingRef,
      };
      sendStatusUpdateEmail(emailData, 'cancelled').catch(console.error);
    }

    res.json(appointment);
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

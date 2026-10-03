const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  // Guest booking details (customer login removed - phone is the identity)
  guestName: {
    type: String,
    trim: true,
    default: '',
    maxlength: 100,
  },
  guestPhone: {
    type: String,
    trim: true,
    default: '',
    maxlength: 20,
  },
  guestEmail: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
  },
  bookingRef: {
    type: String,
    trim: true,
    uppercase: true,
  },
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: [true, 'Staff is required'],
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Service is required'],
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
  },
  // Calendar-day key YYYY-MM-DD (Asia/Colombo) — avoids UTC midnight-shift bugs
  dayKey: {
    type: String,
    required: [true, 'Day is required'],
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Day must be YYYY-MM-DD'],
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:MM format'],
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in HH:MM format'],
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
    default: 'pending',
  },
  notes: {
    type: String,
    trim: true,
    default: '',
    maxlength: 500,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient queries
appointmentSchema.index({ staff: 1, dayKey: 1 });
appointmentSchema.index({ staff: 1, date: 1 });
appointmentSchema.index({ customer: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ guestPhone: 1 });
appointmentSchema.index({ bookingRef: 1 }, { unique: true, sparse: true });

// Auto-fill dayKey from date for legacy docs / direct creates
appointmentSchema.pre('validate', function (next) {
  if (!this.dayKey && this.date) {
    const d = new Date(this.date);
    this.dayKey = d.toISOString().split('T')[0];
  }
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);

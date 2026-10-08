const mongoose = require('mongoose');

const slotBlockSchema = new mongoose.Schema({
  // null staff = whole salon busy (all staff blocked)
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    default: null,
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
  },
  // Calendar-day key YYYY-MM-DD — avoids UTC midnight-shift bugs
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
  reason: {
    type: String,
    trim: true,
    default: 'Busy with walk-in customers',
    maxlength: 200,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

slotBlockSchema.index({ dayKey: 1, staff: 1, startTime: 1 });
slotBlockSchema.index({ date: 1, staff: 1 });

// Auto-fill dayKey from date for legacy docs / direct creates
slotBlockSchema.pre('validate', function (next) {
  if (!this.dayKey && this.date) {
    const d = new Date(this.date);
    this.dayKey = d.toISOString().split('T')[0];
  }
  next();
});

module.exports = mongoose.model('SlotBlock', slotBlockSchema);

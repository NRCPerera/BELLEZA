const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer is required'],
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
appointmentSchema.index({ staff: 1, date: 1 });
appointmentSchema.index({ customer: 1 });
appointmentSchema.index({ status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);

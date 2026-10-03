const mongoose = require('mongoose');

// Short-lived distributed lock: serialises concurrent booking writes per staff-day.
// Key format: `booking:<staffId>:<dayKey>`. Expires automatically via TTL.
const bookingLockSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    expires: 0,
  },
});

module.exports = mongoose.model('BookingLock', bookingLockSchema);

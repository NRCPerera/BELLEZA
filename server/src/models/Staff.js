const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    unique: true,
    sparse: true,
  },
  name: {
    type: String,
    required: [true, 'Staff name is required'],
    trim: true,
    maxlength: 100,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  bio: {
    type: String,
    trim: true,
    default: '',
    maxlength: 500,
  },
  specialties: {
    type: [String],
    default: [],
  },
  photo: {
    type: String,
    default: '',
  },
  workingHours: [
    {
      day: { type: String, required: true },
      start: { type: String, required: true },
      end: { type: String, required: true },
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

staffSchema.index({ isActive: 1 });

module.exports = mongoose.model('Staff', staffSchema);

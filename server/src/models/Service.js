const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    maxlength: 100,
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
    maxlength: 1000,
  },
  durationMinutes: {
    type: Number,
    required: [true, 'Duration is required'],
    min: 15,
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0,
  },
  assignedStaff: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
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

module.exports = mongoose.model('Service', serviceSchema);

const mongoose = require('mongoose');

const portfolioPhotoSchema = new mongoose.Schema({
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: [true, 'Staff reference is required'],
    index: true,
  },
  url: {
    type: String,
    required: [true, 'Photo URL is required'],
  },
  publicId: {
    type: String,
    required: [true, 'Cloudinary public ID is required'],
  },
  mediaType: {
    type: String,
    enum: ['photo', 'video'],
    default: 'photo',
    index: true,
  },
  resourceType: {
    type: String,
    enum: ['image', 'video'],
    default: 'image',
  },
  // Video-only fields (poster image + playback metadata)
  thumbnailUrl: {
    type: String,
    default: '',
  },
  duration: {
    type: Number, // seconds (video only)
    default: 0,
  },
  bytes: { type: Number, default: 0 },
  width: { type: Number, default: 0 },
  height: { type: Number, default: 0 },
  caption: {
    type: String,
    trim: true,
    default: '',
    maxlength: 200,
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    default: null,
  },
  order: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient per-staff queries sorted by order
portfolioPhotoSchema.index({ staff: 1, order: 1 });
// Index for "recent photos" public query
portfolioPhotoSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PortfolioPhoto', portfolioPhotoSchema);

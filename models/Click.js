const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
  movieId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    required: true,
    index: true
  },
  userAgent: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  referer: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  // Geographic data (optional)
  country: {
    type: String
  },
  city: {
    type: String
  }
}, {
  timestamps: true
});

// Compound indexes for analytics queries
clickSchema.index({ movieId: 1, timestamp: -1 });
clickSchema.index({ timestamp: -1 });
clickSchema.index({ movieId: 1, ipAddress: 1, timestamp: -1 });

module.exports = mongoose.model('Click', clickSchema);

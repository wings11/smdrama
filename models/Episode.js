const mongoose = require('mongoose');

const episodeSchema = new mongoose.Schema({
  movieId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    required: true,
    index: true
  },
  season: {
    type: Number,
    default: 1,
    min: 1
  },
  episodeNumber: {
    type: Number,
    required: true,
    min: 1
  },
  title: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  duration: {
    // store seconds for easy aggregation
    type: Number
  },
  thumbnailUrl: {
    type: String
  },
  trailerUrl: {
    type: String
  },
  watchUrl: {
    type: String,
    required: true
  },
  isPublished: {
    type: Boolean,
    default: true,
    index: true
  },
  clickCount: {
    type: Number,
    default: 0,
    index: true
  }
}, {
  timestamps: true
});

// Composite unique index to avoid duplicate episode numbers per season
episodeSchema.index({ movieId: 1, season: 1, episodeNumber: 1 }, { unique: true });
episodeSchema.index({ movieId: 1, createdAt: -1 });

// Increment click count atomically
episodeSchema.statics.incrementClick = async function(episodeId) {
  return this.findByIdAndUpdate(episodeId, { $inc: { clickCount: 1 }, $set: { lastClicked: new Date() } }, { new: true });
};

module.exports = mongoose.model('Episode', episodeSchema);

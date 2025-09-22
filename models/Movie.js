const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  originalTitle: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['movie', 'series'],
    required: true,
    index: true
  },
  year: {
    type: Number,
    min: 1900,
    max: new Date().getFullYear() + 5
  },
  genre: {
    type: [String],
    default: []
  },
  language: {
    type: String,
    default: 'English'
  },
  description: {
    type: String,
    trim: true
  },
  telegramLink: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^https:\/\/(t\.me|telegram\.me)\//.test(v);
      },
      message: 'Please provide a valid Telegram link'
    }
  },
  thumbnailUrl: {
    type: String
  },
  // Media links (stored as URLs, not files)
  posterUrl: {
    type: String,
    trim: true
  },
  trailerUrl: {
    type: String,
    trim: true
  },
  backdropUrl: {
    type: String,
    trim: true
  },
  rating: {
    type: Number,
    min: 0,
    max: 10
  },
  // Multiple rating sources
  imdbRating: {
    type: Number,
    min: 0,
    max: 10
  },
  tmdbRating: {
    type: Number,
    min: 0,
    max: 10
  },
  rottenTomatoesRating: {
    type: Number,
    min: 0,
    max: 100
  },
  metacriticRating: {
    type: Number,
    min: 0,
    max: 100
  },
  duration: {
    type: String // e.g., "2h 15m"
  },
  // Series specific fields
  seasons: {
    type: Number,
    min: 1
  },
  episodes: {
    type: Number,
    min: 1
  },
  // Analytics
  clickCount: {
    type: Number,
    default: 0,
    index: true
  },
  lastClicked: {
    type: Date
  },
  // Admin fields
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // SEO fields
  slug: {
    type: String,
    unique: true,
    index: true
  },
  tags: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

// Create slug from title
movieSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Indexes for better query performance
movieSchema.index({ title: 'text', description: 'text', tags: 'text' }, { default_language: 'english' });
movieSchema.index({ type: 1, isActive: 1, createdAt: -1 });
movieSchema.index({ clickCount: -1 });
movieSchema.index({ isFeatured: 1, createdAt: -1 });

// Instance method to increment click count
movieSchema.methods.incrementClick = async function() {
  this.clickCount += 1;
  this.lastClicked = new Date();
  return await this.save();
};

module.exports = mongoose.model('Movie', movieSchema);

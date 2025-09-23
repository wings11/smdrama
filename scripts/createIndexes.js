const mongoose = require('mongoose');
const config = require('../config');
const Movie = require('../models/Movie');
const User = require('../models/User');
const Episode = require('../models/Episode');

async function createIndexes() {
  try {
    await mongoose.connect(config.mongodbUri, { maxPoolSize: 5, serverSelectionTimeoutMS: 5000 });

    console.log('Connected to MongoDB, creating indexes...');

    // Example indexes - tune as needed
    await Movie.createIndexes([
      { key: { title: 1 }, name: 'title_idx' },
      { key: { type: 1 }, name: 'type_idx' },
      { key: { genre: 1 }, name: 'genre_idx' },
      { key: { tags: 1 }, name: 'tags_idx' },
      { key: { createdAt: -1 }, name: 'createdAt_idx' }
    ]).catch(e => console.warn('Movie indexes might already exist or failed:', e.message));

    await User.createIndexes([
      { key: { email: 1 }, name: 'email_idx', unique: true }
    ]).catch(e => console.warn('User indexes might already exist or failed:', e.message));

    await Episode.createIndexes([
      { key: { movieId: 1, season: 1, episodeNumber: 1 }, name: 'episode_unique_idx' },
      { key: { movieId: 1, createdAt: -1 }, name: 'episode_movie_createdAt_idx' }
    ]).catch(e => console.warn('Episode indexes might already exist or failed:', e.message));

    console.log('Indexes created (or already present).');
    process.exit(0);
  } catch (err) {
    console.error('Error creating indexes:', err);
    process.exit(1);
  }
}

createIndexes();

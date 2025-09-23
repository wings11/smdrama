const mongoose = require('mongoose');
const config = require('../config');
const Movie = require('../models/Movie');
const Episode = require('../models/Episode');

async function inspect() {
  try {
    await mongoose.connect(config.mongodbUri, { maxPoolSize: 5, serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB for inspection');

    const epCount = await Episode.countDocuments();
    console.log('Episode count:', epCount);

    const firstEpisodes = await Episode.find({}).limit(5).lean();
    console.log('Sample episodes:', firstEpisodes);

    const moviesWithTelegram = await Movie.find({ telegramLink: { $exists: true, $ne: null } }).select('title _id telegramLink').limit(10).lean();
    console.log('Movies with telegramLink (sample):', moviesWithTelegram);

    process.exit(0);
  } catch (err) {
    console.error('Inspect error:', err);
    process.exit(1);
  }
}

inspect();
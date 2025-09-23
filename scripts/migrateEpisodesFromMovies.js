const mongoose = require('mongoose');
const config = require('../config');
const Movie = require('../models/Movie');
const Episode = require('../models/Episode');

async function migrate() {
  try {
    await mongoose.connect(config.mongodbUri, { maxPoolSize: 5, serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB for migration');

    const movies = await Movie.find({ telegramLink: { $exists: true, $ne: null } }).lean();
    console.log(`Found ${movies.length} movies with telegramLink`);

    let created = 0;

    for (const m of movies) {
      // If movie already has episodes, skip
      const existing = await Episode.findOne({ movieId: m._id }).lean();
      if (existing) continue;

      const ep = new Episode({
        movieId: m._id,
        season: 1,
        episodeNumber: 1,
        title: m.title + ' - Episode 1',
        description: m.description || '',
        thumbnailUrl: m.posterUrl || m.thumbnailUrl || '',
        watchUrl: m.telegramLink,
        isPublished: true
      });

      await ep.save();
      created++;
    }

    console.log(`Migration complete. Created ${created} episodes.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
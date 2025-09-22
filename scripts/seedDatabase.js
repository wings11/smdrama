const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Movie = require('../models/Movie');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Movie.deleteMany({});

    // Create admin user
    console.log('Creating admin user...');
    const adminUser = new User({
      email: process.env.ADMIN_EMAIL || 'admin@translatedmovies.com',
      password: process.env.ADMIN_PASSWORD || 'admin123456',
      role: 'admin'
    });
    await adminUser.save();
    console.log('Admin user created:', adminUser.email);

    // Create client user
    console.log('Creating client user...');
    const clientUser = new User({
      email: 'client@translatedmovies.com',
      password: 'client123456',
      role: 'client',
      createdBy: adminUser._id
    });
    await clientUser.save();
    console.log('Client user created:', clientUser.email);

    // Create sample movies
    console.log('Creating sample movies...');
    const sampleMovies = [
      {
        title: 'The Dark Knight',
        originalTitle: 'The Dark Knight',
        type: 'movie',
        year: 2008,
        genre: ['Action', 'Crime', 'Drama'],
        language: 'English',
        description: 'Batman faces the Joker in this epic superhero film.',
        telegramLink: 'https://t.me/samplechannel/123',
        rating: 9.0,
        duration: '2h 32m',
        tags: ['batman', 'joker', 'superhero'],
        isFeatured: true,
        uploadedBy: adminUser._id
      },
      {
        title: 'Breaking Bad',
        originalTitle: 'Breaking Bad',
        type: 'series',
        year: 2008,
        genre: ['Crime', 'Drama', 'Thriller'],
        language: 'English',
        description: 'A high school chemistry teacher turned methamphetamine producer.',
        telegramLink: 'https://t.me/samplechannel/124',
        rating: 9.5,
        seasons: 5,
        episodes: 62,
        tags: ['walter white', 'crime', 'drama'],
        isFeatured: true,
        uploadedBy: adminUser._id
      },
      {
        title: 'Avengers: Endgame',
        originalTitle: 'Avengers: Endgame',
        type: 'movie',
        year: 2019,
        genre: ['Action', 'Adventure', 'Drama'],
        language: 'English',
        description: 'The Avengers assemble for the final battle against Thanos.',
        telegramLink: 'https://t.me/samplechannel/125',
        rating: 8.4,
        duration: '3h 1m',
        tags: ['avengers', 'marvel', 'thanos'],
        isFeatured: false,
        uploadedBy: adminUser._id
      },
      {
        title: 'Stranger Things',
        originalTitle: 'Stranger Things',
        type: 'series',
        year: 2016,
        genre: ['Drama', 'Fantasy', 'Horror'],
        language: 'English',
        description: 'A group of kids encounter supernatural forces in their small town.',
        telegramLink: 'https://t.me/samplechannel/126',
        rating: 8.7,
        seasons: 4,
        episodes: 42,
        tags: ['supernatural', 'horror', 'kids'],
        isFeatured: false,
        uploadedBy: adminUser._id
      },
      {
        title: 'Inception',
        originalTitle: 'Inception',
        type: 'movie',
        year: 2010,
        genre: ['Action', 'Sci-Fi', 'Thriller'],
        language: 'English',
        description: 'A thief who enters dreams to steal secrets.',
        telegramLink: 'https://t.me/samplechannel/127',
        rating: 8.8,
        duration: '2h 28m',
        tags: ['dreams', 'sci-fi', 'leonardo dicaprio'],
        isFeatured: true,
        uploadedBy: adminUser._id
      }
    ];

    for (const movieData of sampleMovies) {
      const movie = new Movie(movieData);
      await movie.save();
      console.log('Created movie:', movie.title);
    }

    // Add some click counts to movies
    console.log('Adding sample click counts...');
    const movies = await Movie.find({});
    for (const movie of movies) {
      movie.clickCount = Math.floor(Math.random() * 1000) + 10;
      if (Math.random() > 0.5) {
        movie.lastClicked = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      }
      await movie.save();
    }

    console.log('Database seeded successfully!');
    console.log('\nLogin credentials:');
    console.log('Admin - Email:', adminUser.email, 'Password:', process.env.ADMIN_PASSWORD || 'admin123456');
    console.log('Client - Email:', clientUser.email, 'Password: client123456');
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

// Run the seeder
seedDatabase();

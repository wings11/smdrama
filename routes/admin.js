const express = require('express');
const Movie = require('../models/Movie');
const Episode = require('../models/Episode');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');
const { validateMovie, validateUser, checkValidation } = require('../middleware/validation');
const { deleteCache, getCacheKey } = require('../utils/cache');
const { logger } = require('../utils/logger');

const router = express.Router();

// Apply auth middleware to all admin routes
router.use(auth);
router.use(adminAuth);

// @route   GET /api/admin/dashboard
// @desc    Get dashboard statistics
// @access  Private (Admin)
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalMovies,
      totalSeries,
      activeMovies,
      totalClicks,
      recentMovies,
      topMovies
    ] = await Promise.all([
      Movie.countDocuments({ type: 'movie' }),
      Movie.countDocuments({ type: 'series' }),
      Movie.countDocuments({ isActive: true }),
      Movie.aggregate([
        { $group: { _id: null, totalClicks: { $sum: '$clickCount' } } }
      ]),
      Movie.find({ isActive: true })
        .select('title type clickCount createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Movie.find({ isActive: true })
        .select('title type clickCount')
        .sort({ clickCount: -1 })
        .limit(5)
        .lean()
    ]);

    res.json({
      success: true,
      data: {
        statistics: {
          totalMovies,
          totalSeries,
          activeMovies,
          totalClicks: totalClicks[0]?.totalClicks || 0
        },
        recentMovies,
        topMovies
      }
    });
  } catch (error) {
    logger.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/admin/movies
// @desc    Get all movies (including inactive) with admin details
// @access  Private (Admin)
router.get('/movies', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const type = req.query.type;
    const search = req.query.search;
    const isActive = req.query.isActive;

    let query = {};
    
    if (type) {
      query.type = type;
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    if (search) {
      query.$text = { $search: search };
    }

    const [movies, total] = await Promise.all([
      Movie.find(query)
        .populate('uploadedBy', 'email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Movie.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: movies,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    logger.error('Admin get movies error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/admin/movies/test
// @desc    Test endpoint to debug data
// @access  Private (Admin)
router.post('/movies/test', async (req, res) => {
  try {
    console.log('Test endpoint - Received data:', req.body);
    console.log('Data types:', Object.entries(req.body).map(([key, value]) => [key, typeof value]));
    res.json({ success: true, receivedData: req.body });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: 'Test endpoint error' });
  }
});

// @route   POST /api/admin/movies
// @desc    Create new movie
// @access  Private (Admin)
router.post('/movies', async (req, res) => {
  try {
    console.log('Received movie data:', req.body); // Debug log
    console.log('Request content-type:', req.get('content-type'));
    console.log('Is JSON?:', req.is('application/json'));
    console.log('Origin header:', req.get('origin'));
    console.log('Data types:', Object.entries(req.body).map(([key, value]) => [key, typeof value]));
    
    // Extract episodes payload (do not pass into Movie schema)
    const episodesPayload = Array.isArray(req.body.episodes) ? req.body.episodes : [];

    const movieData = {
      ...req.body,
      uploadedBy: req.user._id
    };
    // remove episodes so Movie schema doesn't try to cast it to Number
    delete movieData.episodes;

    console.log('Final movie data:', movieData);

    const movie = new Movie(movieData);
    await movie.save();

    // If episodes provided in payload, create/upsert them
    if (episodesPayload.length > 0) {
      logger.info('Admin create: processing episodes payload', { count: episodesPayload.length, movieId: movie._id.toString() });
      for (const epData of episodesPayload) {
        try {
          const episodeNumber = epData.episodeNumber ? Number(epData.episodeNumber) : null;
          const watchUrl = epData.watchUrl ? String(epData.watchUrl).trim() : '';
          if (!episodeNumber || !watchUrl) {
            // minimal required fields missing; skip
            console.warn('Skipping episode creation - missing episodeNumber or watchUrl', epData);
            continue;
          }

          // Upsert by movieId + season + episodeNumber
          const season = epData.season ? Number(epData.season) : 1;
          await Episode.findOneAndUpdate(
            { movieId: movie._id, season, episodeNumber },
            { $set: { watchUrl, isPublished: epData.isPublished !== false, title: epData.title || undefined, thumbnailUrl: epData.thumbnailUrl || undefined, duration: epData.duration ? Number(epData.duration) : undefined } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        } catch (err) {
          console.error('Create/upsert episode error in admin create:', err);
        }
      }
      // Clear episode caches for this movie
      try {
        const pattern = getCacheKey('episodes', { movieId: movie._id }) + '*';
        await deleteCache(pattern);
      } catch (e) {
        console.warn('Failed to clear episode cache for movie after create', e.message || e);
      }
    }
    // Fetch updated episodes to include in response so frontend can refresh
    let updatedEpisodes = [];
    try {
      updatedEpisodes = await Episode.find({ movieId: movie._id }).sort({ season: 1, episodeNumber: 1 }).lean();
    } catch (err) {
      console.warn('Failed to fetch updated episodes after admin create', err.message || err);
    }
  // Clear cache
  await deleteCache('movies:*');
  await deleteCache('featured_movies:*');
  await deleteCache('popular_movies:*');
  try { const pattern = getCacheKey('episodes', { movieId: movie._id }) + '*'; await deleteCache(pattern); } catch (e) { /* ignore */ }

    logger.info(`Movie created: ${movie.title} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Movie created successfully',
      data: movie,
      episodes: updatedEpisodes
    });
  } catch (error) {
    console.error('Detailed error:', error);
    
    if (error.name === 'ValidationError') {
      console.error('MongoDB Validation Error:', error.errors);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: Object.values(error.errors).map(e => e.message)
      });
    }
    
    if (error.code === 11000) {
      console.error('Duplicate key error:', error.keyValue);
      return res.status(400).json({ 
        error: 'Duplicate entry', 
        field: Object.keys(error.keyValue)[0]
      });
    }
    
    logger.error('Create movie error:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error.message || 'Unknown error'
    });
  }
});

// @route   PUT /api/admin/movies/:id
// @desc    Update movie
// @access  Private (Admin)
router.put('/movies/:id', validateMovie, checkValidation, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

  console.log('Request content-type:', req.get('content-type'));
  console.log('Is JSON?:', req.is('application/json'));
  console.log('Origin header:', req.get('origin'));
  // Extract episodes payload and remove from body to avoid casting errors
    const episodesPayload = Array.isArray(req.body.episodes) ? req.body.episodes : [];
    if (episodesPayload.length > 0) delete req.body.episodes;

    // Update movie
    Object.assign(movie, req.body);
    await movie.save();

      // If episodes provided in payload, upsert them
      if (episodesPayload.length > 0) {
        logger.info('Admin update: processing episodes payload', { count: episodesPayload.length, movieId: movie._id.toString() });
        for (const epData of episodesPayload) {
          try {
            const episodeNumber = epData.episodeNumber ? Number(epData.episodeNumber) : null;
            const watchUrl = epData.watchUrl ? String(epData.watchUrl).trim() : '';
            if (!episodeNumber || !watchUrl) {
              console.warn('Skipping episode upsert - missing episodeNumber or watchUrl', epData);
              continue;
            }

            const season = epData.season ? Number(epData.season) : 1;
            if (epData._id && !String(epData._id).startsWith('tmp-')) {
              // update by id if belongs to this movie
              const existing = await Episode.findById(epData._id);
              if (existing && String(existing.movieId) === String(movie._id)) {
                existing.episodeNumber = episodeNumber;
                existing.season = season;
                existing.watchUrl = watchUrl;
                existing.isPublished = epData.isPublished !== undefined ? !!epData.isPublished : existing.isPublished;
                existing.title = epData.title || existing.title;
                existing.thumbnailUrl = epData.thumbnailUrl || existing.thumbnailUrl;
                existing.duration = epData.duration ? Number(epData.duration) : existing.duration;
                await existing.save();
                continue;
              }
            }

            // upsert by movieId+season+episodeNumber
            await Episode.findOneAndUpdate(
              { movieId: movie._id, season, episodeNumber },
              { $set: { watchUrl, isPublished: epData.isPublished !== false, title: epData.title || undefined, thumbnailUrl: epData.thumbnailUrl || undefined, duration: epData.duration ? Number(epData.duration) : undefined } },
              { upsert: true, new: true, setDefaultsOnInsert: true }
            );
          } catch (err) {
            console.error('Upsert episode error in admin update:', err);
          }
        }
        // Clear episode caches for this movie
        try {
          const pattern = getCacheKey('episodes', { movieId: movie._id }) + '*';
          await deleteCache(pattern);
        } catch (e) {
          console.warn('Failed to clear episode cache for movie during update', e.message || e);
        }
      }
      // Fetch updated episodes to include in response so frontend can refresh
      let updatedEpisodesOnUpdate = [];
      try {
        updatedEpisodesOnUpdate = await Episode.find({ movieId: movie._id }).sort({ season: 1, episodeNumber: 1 }).lean();
      } catch (err) {
        console.warn('Failed to fetch updated episodes after admin update', err.message || err);
      }
  // Clear cache
  await deleteCache('movies:*');
  await deleteCache('featured_movies:*');
  await deleteCache('popular_movies:*');
  try { const pattern = getCacheKey('episodes', { movieId: movie._id }) + '*'; await deleteCache(pattern); } catch (e) { /* ignore */ }

    logger.info(`Movie updated: ${movie.title} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Movie updated successfully',
      data: movie,
      episodes: updatedEpisodesOnUpdate
    });
  } catch (error) {
    logger.error('Update movie error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/admin/movies/:id
// @desc    Delete movie (soft delete)
// @access  Private (Admin)
router.delete('/movies/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    // Soft delete
    movie.isActive = false;
    await movie.save();

    // Clear cache
    await deleteCache('movies:*');
    await deleteCache('featured_movies:*');
    await deleteCache('popular_movies:*');

    logger.info(`Movie deleted: ${movie.title} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Movie deleted successfully'
    });
  } catch (error) {
    logger.error('Delete movie error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/admin/movies/:id/feature
// @desc    Toggle movie featured status
// @access  Private (Admin)
router.put('/movies/:id/feature', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    movie.isFeatured = !movie.isFeatured;
    await movie.save();

    // Clear cache
    await deleteCache('featured_movies:*');

    logger.info(`Movie featured status changed: ${movie.title} to ${movie.isFeatured} by ${req.user.email}`);

    res.json({
      success: true,
      message: `Movie ${movie.isFeatured ? 'featured' : 'unfeatured'} successfully`,
      isFeatured: movie.isFeatured
    });
  } catch (error) {
    logger.error('Toggle feature error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private (Admin)
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({})
        .select('-password')
        .populate('createdBy', 'email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments({})
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    logger.error('Admin get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/admin/users
// @desc    Create new user
// @access  Private (Admin)
router.post('/users', validateUser, checkValidation, async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = new User({
      email,
      password,
      role,
      createdBy: req.user._id
    });

    await user.save();

    logger.info(`User created: ${email} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/admin/users/:id/toggle-status
// @desc    Toggle user active status
// @access  Private (Admin)
router.put('/users/:id/toggle-status', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    user.isActive = !user.isActive;
    await user.save();

    logger.info(`User status changed: ${user.email} to ${user.isActive ? 'active' : 'inactive'} by ${req.user.email}`);

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: user.isActive
    });
  } catch (error) {
    logger.error('Toggle user status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

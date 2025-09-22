const express = require('express');
const Movie = require('../models/Movie');
const Click = require('../models/Click');
const { auth, clientAuth } = require('../middleware/auth');
const { getCacheKey, getCache, setCache } = require('../utils/cache');
const { logger } = require('../utils/logger');

const router = express.Router();

// Apply auth middleware to all client routes
router.use(auth);
router.use(clientAuth);

// @route   GET /api/client/dashboard
// @desc    Get client dashboard with basic stats
// @access  Private (Client)
router.get('/dashboard', async (req, res) => {
  try {
    const cacheKey = getCacheKey('client_dashboard');
    const cachedData = await getCache(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }

    const [
      totalMovies,
      totalSeries,
      totalClicks,
      topMovies
    ] = await Promise.all([
      Movie.countDocuments({ type: 'movie', isActive: true }),
      Movie.countDocuments({ type: 'series', isActive: true }),
      Movie.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, totalClicks: { $sum: '$clickCount' } } }
      ]),
      Movie.find({ isActive: true })
        .select('title type clickCount')
        .sort({ clickCount: -1 })
        .limit(10)
        .lean()
    ]);

    const result = {
      success: true,
      data: {
        statistics: {
          totalMovies,
          totalSeries,
          totalClicks: totalClicks[0]?.totalClicks || 0
        },
        topMovies
      }
    };

    // Cache for 5 minutes
    await setCache(cacheKey, result, 300);

    res.json(result);
  } catch (error) {
    logger.error('Client dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/client/movies/analytics
// @desc    Get movies with click analytics
// @access  Private (Client)
router.get('/movies/analytics', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'clickCount';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const type = req.query.type;
    const search = req.query.search;

    let query = { isActive: true };
    
    if (type) {
      query.type = type;
    }
    
    if (search) {
      query.$text = { $search: search };
    }

    const cacheKey = getCacheKey('client_movies_analytics', {
      page,
      limit,
      sortBy,
      sortOrder,
      type,
      search
    });

    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const sort = {};
    sort[sortBy] = sortOrder;

    const [movies, total] = await Promise.all([
      Movie.find(query)
        .select('title originalTitle type year genre clickCount lastClicked isFeatured createdAt')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Movie.countDocuments(query)
    ]);

    const result = {
      success: true,
      data: movies,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    };

    // Cache for 2 minutes
    await setCache(cacheKey, result, 120);

    res.json(result);
  } catch (error) {
    logger.error('Client movies analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/client/movies/:id/clicks
// @desc    Get detailed click analytics for a specific movie
// @access  Private (Client)
router.get('/movies/:id/clicks', async (req, res) => {
  try {
    const movieId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Check if movie exists
    const movie = await Movie.findById(movieId).select('title type clickCount');
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const [clicks, total] = await Promise.all([
      Click.find({ movieId })
        .select('timestamp userAgent ipAddress referer country city')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Click.countDocuments({ movieId })
    ]);

    res.json({
      success: true,
      movie: {
        title: movie.title,
        type: movie.type,
        totalClicks: movie.clickCount
      },
      data: clicks,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    logger.error('Client movie clicks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

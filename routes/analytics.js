const express = require('express');
const Movie = require('../models/Movie');
const Click = require('../models/Click');
const { auth } = require('../middleware/auth');
const { getCacheKey, getCache, setCache } = require('../utils/cache');
const { logger } = require('../utils/logger');

const router = express.Router();

// Apply auth middleware to all analytics routes
router.use(auth);

// @route   GET /api/analytics/overview
// @desc    Get overall analytics overview
// @access  Private
router.get('/overview', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const cacheKey = getCacheKey('analytics_overview', { days });
    const cachedData = await getCache(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }

    const [
      totalMovies,
      totalSeries,
      totalClicks,
      recentClicks,
      topMoviesThisPeriod,
      clicksByDay
    ] = await Promise.all([
      Movie.countDocuments({ isActive: true, type: 'movie' }),
      Movie.countDocuments({ isActive: true, type: 'series' }),
      Movie.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, totalClicks: { $sum: '$clickCount' } } }
      ]),
      Click.countDocuments({ timestamp: { $gte: startDate } }),
      Movie.aggregate([
        { $match: { isActive: true, lastClicked: { $gte: startDate } } },
        { $sort: { clickCount: -1 } },
        { $limit: 10 },
        { $project: { title: 1, type: 1, clickCount: 1 } }
      ]),
      Click.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$timestamp" }
            },
            clicks: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const result = {
      success: true,
      data: {
        overview: {
          totalMovies,
          totalSeries,
          totalClicks: totalClicks[0]?.totalClicks || 0,
          recentClicks
        },
        topMoviesThisPeriod,
        clicksByDay
      }
    };

    // Cache for 10 minutes
    await setCache(cacheKey, result, 600);

    res.json(result);
  } catch (error) {
    logger.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/analytics/movies/top
// @desc    Get top movies by clicks
// @access  Private
router.get('/movies/top', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type; // 'movie' or 'series'
    const days = parseInt(req.query.days) || null; // For time-based filtering

    let query = { isActive: true };
    if (type) {
      query.type = type;
    }

    let pipeline = [
      { $match: query },
      { $sort: { clickCount: -1 } },
      { $limit: limit },
      {
        $project: {
          title: 1,
          originalTitle: 1,
          type: 1,
          year: 1,
          genre: 1,
          clickCount: 1,
          lastClicked: 1,
          createdAt: 1
        }
      }
    ];

    // If days filter is provided, get movies that were clicked in that period
    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      query.lastClicked = { $gte: startDate };
    }

    const cacheKey = getCacheKey('analytics_top_movies', { limit, type, days });
    const cachedData = await getCache(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }

    const topMovies = await Movie.aggregate(pipeline);

    const result = {
      success: true,
      data: topMovies
    };

    // Cache for 5 minutes
    await setCache(cacheKey, result, 300);

    res.json(result);
  } catch (error) {
    logger.error('Analytics top movies error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/analytics/clicks/hourly
// @desc    Get hourly click distribution
// @access  Private
router.get('/clicks/hourly', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const cacheKey = getCacheKey('analytics_hourly_clicks', { days });
    const cachedData = await getCache(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }

    const hourlyClicks = await Click.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: { $hour: "$timestamp" },
          clicks: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          hour: "$_id",
          clicks: 1,
          _id: 0
        }
      }
    ]);

    const result = {
      success: true,
      data: hourlyClicks
    };

    // Cache for 30 minutes
    await setCache(cacheKey, result, 1800);

    res.json(result);
  } catch (error) {
    logger.error('Analytics hourly clicks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/analytics/movies/:id/stats
// @desc    Get detailed stats for a specific movie
// @access  Private
router.get('/movies/:id/stats', async (req, res) => {
  try {
    const movieId = req.params.id;
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Check if movie exists
    const movie = await Movie.findById(movieId).select('title type clickCount lastClicked createdAt');
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const [
      totalClicks,
      recentClicks,
      clicksByDay,
      topReferers
    ] = await Promise.all([
      Click.countDocuments({ movieId }),
      Click.countDocuments({ movieId, timestamp: { $gte: startDate } }),
      Click.aggregate([
        { $match: { movieId: movie._id, timestamp: { $gte: startDate } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$timestamp" }
            },
            clicks: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Click.aggregate([
        { $match: { movieId: movie._id, referer: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: "$referer",
            clicks: { $sum: 1 }
          }
        },
        { $sort: { clicks: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.json({
      success: true,
      movie: {
        title: movie.title,
        type: movie.type,
        createdAt: movie.createdAt
      },
      stats: {
        totalClicks,
        recentClicks,
        clicksByDay,
        topReferers
      }
    });
  } catch (error) {
    logger.error('Analytics movie stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

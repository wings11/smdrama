const express = require('express');
const Movie = require('../models/Movie');
const Click = require('../models/Click');
const { getCacheKey, getCache, setCache, deleteCache } = require('../utils/cache');
const { logger } = require('../utils/logger');

const router = express.Router();

// @route   GET /api/movies
// @desc    Get all active movies with pagination and filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const type = req.query.type; // 'movie' or 'series'
    const genre = req.query.genre; // Genre filter
    const tag = req.query.tag; // Tag filter
    const search = req.query.search;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Build query
    let query = { isActive: true };
    
    if (type) {
      query.type = type;
    }
    
    if (genre) {
      query.genre = { $in: [genre] };
    }
    
    if (tag) {
      query.tags = { $in: [tag] };
    }
    
    if (search) {
      query.$text = { $search: search };
    }

    // Cache key
    const cacheKey = getCacheKey('movies', {
      page,
      limit,
      type,
      genre,
      tag,
      search,
      sortBy,
      sortOrder
    });

    // Try to get from cache first
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder;

    // If searching by text, add text score sorting
    if (search) {
      sort.score = { $meta: 'textScore' };
    }

    const [movies, total] = await Promise.all([
      Movie.find(query)
        .select('title originalTitle type year genre language description thumbnailUrl posterUrl trailerUrl backdropUrl rating duration seasons episodes clickCount isFeatured slug tags createdAt')
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
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    };

    // Cache the result for 5 minutes
    await setCache(cacheKey, result, 300);

    res.json(result);
  } catch (error) {
    logger.error('Get movies error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/movies/featured
// @desc    Get featured movies
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const cacheKey = getCacheKey('featured_movies', { limit });
    const cachedData = await getCache(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }

    const movies = await Movie.find({ isActive: true, isFeatured: true })
      .select('title originalTitle type year genre language description thumbnailUrl posterUrl trailerUrl backdropUrl rating duration seasons episodes clickCount slug tags createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const result = {
      success: true,
      data: movies
    };

    // Cache for 10 minutes
    await setCache(cacheKey, result, 600);

    res.json(result);
  } catch (error) {
    logger.error('Get featured movies error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/movies/popular
// @desc    Get popular movies (by click count)
// @access  Public
router.get('/popular', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const type = req.query.type;
    
    let query = { isActive: true };
    if (type) {
      query.type = type;
    }

    const cacheKey = getCacheKey('popular_movies', { limit, type });
    const cachedData = await getCache(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }

    const movies = await Movie.find(query)
      .select('title originalTitle type year genre language description thumbnailUrl posterUrl trailerUrl backdropUrl rating duration seasons episodes clickCount slug tags createdAt')
      .sort({ clickCount: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    const result = {
      success: true,
      data: movies
    };

    // Cache for 5 minutes
    await setCache(cacheKey, result, 300);

    res.json(result);
  } catch (error) {
    logger.error('Get popular movies error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/movies/:id
// @desc    Get single movie by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const movie = await Movie.findOne({ 
      _id: req.params.id, 
      isActive: true 
    }).select('title originalTitle type year genre language description posterUrl trailerUrl backdropUrl rating duration seasons episodes clickCount isFeatured slug tags createdAt telegramLink').lean();

    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    res.json({
      success: true,
      data: movie
    });
  } catch (error) {
    logger.error('Get movie error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/movies/slug/:slug
// @desc    Get single movie by slug
// @access  Public
router.get('/slug/:slug', async (req, res) => {
  try {
    const movie = await Movie.findOne({ 
      slug: req.params.slug, 
      isActive: true 
    }).select('-telegramLink').lean();

    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    res.json({
      success: true,
      data: movie
    });
  } catch (error) {
    logger.error('Get movie by slug error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/movies/:id/click
// @desc    Record click and get telegram link
// @access  Public
router.post('/:id/click', async (req, res) => {
  try {
    const movie = await Movie.findOne({ 
      _id: req.params.id, 
      isActive: true 
    });

    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    // Record the click
    const click = new Click({
      movieId: movie._id,
      userAgent: req.get('User-Agent') || 'Unknown',
      ipAddress: req.ip || req.connection.remoteAddress || 'Unknown',
      referer: req.get('Referer'),
      timestamp: new Date()
    });

    // Save click and increment movie click count in parallel
    await Promise.all([
      click.save(),
      movie.incrementClick()
    ]);

    // Clear cache for movie lists
    await deleteCache('movies:*');
    await deleteCache('popular_movies:*');

    logger.info(`Movie clicked: ${movie.title} (ID: ${movie._id})`);

    res.json({
      success: true,
      telegramLink: movie.telegramLink,
      title: movie.title
    });
  } catch (error) {
    logger.error('Movie click error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/movies/filters/genres
// @desc    Get all unique genres
// @access  Public
router.get('/filters/genres', async (req, res) => {
  try {
    const cacheKey = getCacheKey('genres');
    const cachedData = await getCache(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }

    const genres = await Movie.distinct('genre', { isActive: true });
    const result = {
      success: true,
      data: genres.sort()
    };

    // Cache for 1 hour
    await setCache(cacheKey, result, 3600);
    
    res.json(result);
  } catch (error) {
    logger.error('Get genres error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/movies/filters/tags
// @desc    Get all unique tags
// @access  Public
router.get('/filters/tags', async (req, res) => {
  try {
    const cacheKey = getCacheKey('tags');
    const cachedData = await getCache(cacheKey);
    
    if (cachedData) {
      return res.json(cachedData);
    }

    const tags = await Movie.distinct('tags', { isActive: true });
    const result = {
      success: true,
      data: tags.filter(tag => tag && tag.trim()).sort()
    };

    // Cache for 1 hour
    await setCache(cacheKey, result, 3600);
    
    res.json(result);
  } catch (error) {
    logger.error('Get tags error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

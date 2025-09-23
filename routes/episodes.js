const express = require('express');
const Episode = require('../models/Episode');
const Movie = require('../models/Movie');
const Click = require('../models/Click');
const { auth, adminAuth } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const { getCacheKey, getCache, setCache, deleteCache } = require('../utils/cache');

const router = express.Router();

// Public: list episodes for a movie
router.get('/movies/:movieId/episodes', async (req, res) => {
  try {
    const movieId = req.params.movieId;
    const season = req.query.season ? parseInt(req.query.season) : undefined;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const cacheKey = getCacheKey('episodes', { movieId, season, page, limit });
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const q = { movieId, isPublished: true };
    if (season) q.season = season;

    const [episodes, total] = await Promise.all([
      Episode.find(q).sort({ season: 1, episodeNumber: 1 }).skip(skip).limit(limit).lean(),
      Episode.countDocuments(q)
    ]);

    const result = { success: true, data: episodes, pagination: { currentPage: page, totalPages: Math.ceil(total / limit), totalItems: total } };
    await setCache(cacheKey, result, 300);
    res.json(result);
  } catch (err) {
    logger.error('List episodes error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: get single episode
router.get('/:id', async (req, res) => {
  try {
    const ep = await Episode.findById(req.params.id).lean();
    if (!ep) return res.status(404).json({ error: 'Episode not found' });
    res.json({ success: true, data: ep });
  } catch (err) {
    logger.error('Get episode error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: click endpoint - increments count and returns watchUrl
router.post('/:id/click', async (req, res) => {
  try {
    const episode = await Episode.findById(req.params.id);
    if (!episode || !episode.isPublished) return res.status(404).json({ error: 'Episode not found' });

    const click = new Click({ movieId: episode.movieId, userAgent: req.get('User-Agent') || 'Unknown', ipAddress: req.ip || req.connection.remoteAddress || 'Unknown', referer: req.get('Referer'), timestamp: new Date() });
    // Increment episode click count and also increment parent movie click count so series views increase when an episode is watched
    const movie = await Movie.findById(episode.movieId);
    await Promise.all([
      click.save(),
      Episode.findByIdAndUpdate(episode._id, { $inc: { clickCount: 1 } }),
      movie ? movie.incrementClick() : Promise.resolve()
    ]);

    // Invalidate caches related to this movie and movie lists so UI picks up new click counts
    try {
      const epPattern = getCacheKey('episodes', { movieId: episode.movieId }) + '*';
      await deleteCache(epPattern);
      await deleteCache('movies:*');
      await deleteCache('popular_movies:*');
    } catch (e) {
      logger.warn('Failed to clear caches after episode click', e.message || e);
    }

    res.json({ success: true, watchUrl: episode.watchUrl, title: episode.title || '' });
  } catch (err) {
    logger.error('Episode click error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin routes - protected
router.use(auth);
router.use(adminAuth);

// Create episode
router.post('/movies/:movieId/episodes', async (req, res) => {
  try {
    const movieId = req.params.movieId;
    const movie = await Movie.findById(movieId);
    if (!movie) return res.status(404).json({ error: 'Parent movie not found' });

    const data = { ...req.body, movieId };
    const episode = new Episode(data);
    await episode.save();

    // Clear related caches
    try {
      const pattern = getCacheKey('episodes', { movieId }) + '*';
      await deleteCache(pattern);
    } catch (e) {
      logger.warn('Failed to clear episode cache after create', e.message || e);
    }

    res.status(201).json({ success: true, data: episode });
  } catch (err) {
    logger.error('Create episode error:', err);
    if (err.code === 11000) return res.status(400).json({ error: 'Duplicate episode number for season' });
    res.status(500).json({ error: 'Server error' });
  }
});

// Update episode
router.put('/:id', async (req, res) => {
  try {
    const ep = await Episode.findById(req.params.id);
    if (!ep) return res.status(404).json({ error: 'Episode not found' });
    Object.assign(ep, req.body);
    await ep.save();

    try {
      const pattern = getCacheKey('episodes', { movieId: ep.movieId }) + '*';
      await deleteCache(pattern);
    } catch (e) {
      logger.warn('Failed to clear episode cache after update', e.message || e);
    }
    res.json({ success: true, data: ep });
  } catch (err) {
    logger.error('Update episode error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete episode (soft-delete - mark unpublished)
router.delete('/:id', async (req, res) => {
  try {
    const ep = await Episode.findById(req.params.id);
    if (!ep) return res.status(404).json({ error: 'Episode not found' });
    ep.isPublished = false;
    await ep.save();
    try {
      const pattern = getCacheKey('episodes', { movieId: ep.movieId }) + '*';
      await deleteCache(pattern);
    } catch (e) {
      logger.warn('Failed to clear episode cache after delete', e.message || e);
    }
    res.json({ success: true });
  } catch (err) {
    logger.error('Delete episode error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

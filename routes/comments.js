
const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');

// Get a single comment by its MongoDB _id
router.get('/single/:id', async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, comment });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch comment' });
  }
});

// Get comments for a content (movie or episode)
router.get('/:contentId', async (req, res) => {
  console.log('GET /api/comments/' + req.params.contentId, 'Headers:', req.headers);
  try {
    const comments = await Comment.find({ contentId: req.params.contentId }).sort({ createdAt: -1 });
    res.json({ success: true, comments });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch comments' });
  }
});

// Post a new comment
router.post('/:contentId', async (req, res) => {
  const { name, comment } = req.body;
  if (!name || !comment) {
    return res.status(400).json({ success: false, error: 'Name and comment are required' });
  }
  try {
    const newComment = new Comment({
      contentId: req.params.contentId,
      name,
      comment
    });
    await newComment.save();
    res.json({ success: true, comment: newComment });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to post comment' });
  }
});

module.exports = router;

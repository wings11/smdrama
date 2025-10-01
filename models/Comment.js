const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  contentId: { type: String, required: true }, // movie or episode id
  name: { type: String, required: true },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comment', commentSchema);
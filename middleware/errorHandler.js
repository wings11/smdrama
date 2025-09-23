const { logger } = require('../utils/logger');
const config = require('../config');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error (include stack only in non-production)
  logger.error(`Error: ${err.message}`, {
    stack: config.env === 'production' ? undefined : err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  const response = {
    success: false,
    error: error.message || 'Server Error'
  };

  // In non-production, include a little more debug info
  if (config.env !== 'production') {
    response.debug = {
      stack: err.stack
    };
  }

  res.status(error.statusCode || 500).json(response);
};

module.exports = { errorHandler };

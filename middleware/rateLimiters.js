const express = require('express');
const rateLimit = require('express-rate-limit');

// Create additional rate limiters for different endpoints
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false,
});

// Different rate limits for different endpoints
const strictRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // limit each IP to 10 requests per windowMs
  'Too many requests from this IP, please try again later.'
);

const moderateRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  50, // limit each IP to 50 requests per windowMs
  'Too many requests from this IP, please try again later.'
);

const relaxedRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  200, // limit each IP to 200 requests per windowMs
  'Too many requests from this IP, please try again later.'
);

module.exports = {
  strictRateLimit,    // For sensitive operations like login
  moderateRateLimit,  // For admin operations
  relaxedRateLimit    // For public browsing
};

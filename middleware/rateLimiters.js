const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');
const config = require('../config');

let redisClient = null;
let RedisStore = null;
let redisStoreAvailable = false;

if (config.redisUrl) {
  // config.redisUrl should be a redis:// or rediss:// URI (Upstash provides both options)
  redisClient = new Redis(config.redisUrl, { connectTimeout: 5000 });
  redisClient.on('error', (err) => console.warn('Redis error for rate limiter:', err.message));

  try {
    // Load rate-limit-redis only if available. This package is optional.
    // eslint-disable-next-line global-require
    RedisStore = require('rate-limit-redis');
    redisStoreAvailable = true;
  } catch (err) {
    console.warn('rate-limit-redis not installed; falling back to in-memory rate limiting. To enable Redis-backed limits, install rate-limit-redis.');
    redisStoreAvailable = false;
  }
}

const createRateLimit = (windowMs, max, message) => {
  const base = {
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  };

  if (redisClient && redisStoreAvailable && RedisStore) {
    return rateLimit(Object.assign({}, base, { store: new RedisStore({ sendCommand: (...args) => redisClient.call(...args) }) }));
  }

  // Fallback: single-instance in-memory limiter
  return rateLimit(base);
};

const strictRateLimit = createRateLimit(15 * 60 * 1000, 10, 'Too many requests from this IP, please try again later.');
const moderateRateLimit = createRateLimit(15 * 60 * 1000, 50, 'Too many requests from this IP, please try again later.');
const relaxedRateLimit = createRateLimit(15 * 60 * 1000, 200, 'Too many requests from this IP, please try again later.');

module.exports = {
  strictRateLimit,
  moderateRateLimit,
  relaxedRateLimit,
};

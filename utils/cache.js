const redis = require('redis');
const { logger } = require('./logger');

let client = null;

// Initialize Redis client
const initRedis = async () => {
  try {
    if (process.env.REDIS_URL) {
      client = redis.createClient({
        url: process.env.REDIS_URL
      });

      client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
      });

      client.on('connect', () => {
        logger.info('Redis Client Connected');
      });

      await client.connect();
    } else {
      logger.warn('Redis URL not provided, caching disabled');
    }
  } catch (error) {
    logger.error('Redis initialization failed:', error);
  }
};

// Initialize Redis on module load
initRedis();

// Generate cache key
const getCacheKey = (prefix, params = {}) => {
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  return paramString ? `${prefix}:${paramString}` : prefix;
};

// Get data from cache
const getCache = async (key) => {
  if (!client) return null;
  
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('Cache get error:', error);
    return null;
  }
};

// Set data to cache
const setCache = async (key, data, ttl = 300) => {
  if (!client) return false;
  
  try {
    await client.setEx(key, ttl, JSON.stringify(data));
    return true;
  } catch (error) {
    logger.error('Cache set error:', error);
    return false;
  }
};

// Delete cache by key or pattern
const deleteCache = async (pattern) => {
  if (!client) return false;
  
  try {
    if (pattern.includes('*')) {
      // Handle pattern deletion
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
    } else {
      // Single key deletion
      await client.del(pattern);
    }
    return true;
  } catch (error) {
    logger.error('Cache delete error:', error);
    return false;
  }
};

// Clear all cache
const clearCache = async () => {
  if (!client) return false;
  
  try {
    await client.flushAll();
    return true;
  } catch (error) {
    logger.error('Cache clear error:', error);
    return false;
  }
};

// Check if Redis is connected
const isConnected = () => {
  return client && client.isReady;
};

module.exports = {
  getCacheKey,
  getCache,
  setCache,
  deleteCache,
  clearCache,
  isConnected
};

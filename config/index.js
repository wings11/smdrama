const Joi = require('joi');
require('dotenv').config();

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(5000),
  MONGODB_URI: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('30d'),
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  REDIS_URL: Joi.string().uri().allow('', null),
  UPSTASH_REDIS_REST_URL: Joi.string().uri().allow('', null),
  UPSTASH_REDIS_REST_TOKEN: Joi.string().allow('', null),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'verbose', 'debug').default('info')
}).unknown(true);

const { error, value: env } = schema.validate(process.env, { abortEarly: false });

if (error) {
  console.error('Environment validation error:', error.details.map(d => d.message).join(', '));
  throw new Error('Invalid environment configuration. See log for details.');
}

// Coerce origin into array
const corsOrigins = env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',').map(s => s.trim()) : ['http://localhost:3000'];

// If a Redis URI isn't provided but Upstash REST credentials are, warn the user.
if ((!env.REDIS_URL || env.REDIS_URL === '') && env.UPSTASH_REDIS_REST_URL) {
  // Use console.warn here early during startup; this helps in Render logs.
  console.warn('REDIS_URL is not set. Upstash REST URL detected.');
  console.warn('The built-in rate-limiter expects a Redis connection string (REDIS_URL).');
  console.warn('If you can, copy the Redis (TLS) URI from Upstash and set REDIS_URL in the environment for better performance.');
}

module.exports = {
  env: env.NODE_ENV,
  port: env.PORT,
  mongodbUri: env.MONGODB_URI,
  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  corsOrigins,
  rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
  rateLimitMaxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  redisUrl: env.REDIS_URL || null,
  upstashRestUrl: env.UPSTASH_REDIS_REST_URL || null,
  upstashRestToken: env.UPSTASH_REDIS_REST_TOKEN || null,
  logLevel: env.LOG_LEVEL
};

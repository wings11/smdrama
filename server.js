const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
// Import routes
const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movies');
const adminRoutes = require('./routes/admin');
const clientRoutes = require('./routes/client');
const analyticsRoutes = require('./routes/analytics');
const episodesRoutes = require('./routes/episodes');
const asianwikiRoutes = require('./routes/asianwiki');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { strictRateLimit, moderateRateLimit, relaxedRateLimit } = require('./middleware/rateLimiters');
const { logger } = require('./utils/logger');
const { startScheduledJobs } = require('./utils/scheduler');

const app = express();

const config = require('./config');

// Trust proxy for accurate IP addresses behind reverse proxy (only when behind a proxy)
if (config.env === 'production') {
  app.set('trust proxy', 1);
}

// Redirect HTTP to HTTPS in production (when behind a proxy that sets x-forwarded-proto)
if (config.env === 'production') {
  app.use((req, res, next) => {
    const proto = req.get('x-forwarded-proto');
    if (proto && proto.indexOf('https') === -1) {
      return res.redirect(301, `https://${req.get('host')}${req.originalUrl}`);
    }
    next();
  });
}

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
        frameSrc: ["'self'", 'https://www.youtube.com', 'https://www.youtube-nocookie.com'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  next();
});

app.use(compression());

// Prevent NoSQL injection attacks
app.use(mongoSanitize({
  allowDots: true,
  replaceWith: '_'
}));

// CORS configuration with security
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    if (config.corsOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Enhanced rate limiting with different tiers
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs || 15 * 60 * 1000, // 15 minutes
  max: config.rateLimitMaxRequests || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.round((config.rateLimitWindowMs || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  },
  keyGenerator: (req) => {
    // Use forwarded IP if behind proxy, otherwise use connection IP
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
});

app.use('/api/', limiter);

// Body parsing middleware with size limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 100
}));

// Security logging middleware - sanitize sensitive data
app.use(morgan('combined', {
  stream: {
    write: (message) => {
      // Remove sensitive data from logs
      let sanitizedMessage = message
        .replace(/password=([^&\s]+)/gi, 'password=[REDACTED]')
        .replace(/token=([^&\s]+)/gi, 'token=[REDACTED]')
        .replace(/apikey=([^&\s]+)/gi, 'apikey=[REDACTED]')
        .replace(/authorization:\s*bearer\s+[^\s]+/gi, 'authorization: bearer [REDACTED]');
      
      logger.info(sanitizedMessage.trim());
    }
  },
  skip: (req) => {
    // Skip logging for health checks to reduce noise
    return req.path === '/api/health';
  }
}));

// Database connection with security options
// Mongoose connection options: keep minimal, avoid deprecated flags
const mongooseOptions = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  bufferCommands: false, // Disable mongoose buffering
  // Enforce schema validation on updates (set via mongoose.set below)
};

// Set mongoose runtime options that are not MongoClient options
mongoose.set('strictQuery', true);

mongoose.connect(config.mongodbUri, mongooseOptions)
  .then(() => {
    logger.info('Connected to MongoDB');
    // Start scheduled jobs after DB connection (only in production)
    if (config.env === 'production') {
      startScheduledJobs();
    }
  })
  .catch((error) => {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Handle MongoDB connection errors after initial connection
mongoose.connection.on('error', (error) => {
  logger.error('MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

// Routes with specific rate limiting
app.use('/api/auth/login', strictRateLimit);
app.use('/api/auth', authRoutes);
app.use('/api/movies', relaxedRateLimit, movieRoutes);
app.use('/api/admin', moderateRateLimit, adminRoutes);
app.use('/api/client', moderateRateLimit, clientRoutes);
app.use('/api/analytics', moderateRateLimit, analyticsRoutes);
app.use('/api/episodes', relaxedRateLimit, episodesRoutes);
// Also expose episodes routes at /api so endpoints like /api/movies/:movieId/episodes work
app.use('/api', relaxedRateLimit, episodesRoutes);

// AsianWiki scraping proxy
app.use('/api/asianwiki', relaxedRateLimit, asianwikiRoutes);

// Health check with security info
app.get('/api/health', (req, res) => {
  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100
    }
  };

  // Don't expose sensitive info in production
  if (config.env === 'production') {
    delete healthData.memory;
    delete healthData.environment;
  }

  res.status(200).json(healthData);
});

// Security endpoint to test rate limiting
app.get('/api/security-test', (req, res) => {
  res.status(200).json({
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    message: 'Security test endpoint'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = config.port || 5000;

// In production, prefer using the environment provided port
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${config.env}`);
});

module.exports = app;

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movies');
const adminRoutes = require('./routes/admin');
const clientRoutes = require('./routes/client');
const analyticsRoutes = require('./routes/analytics');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { strictRateLimit, moderateRateLimit, relaxedRateLimit } = require('./middleware/rateLimiters');
const { logger } = require('./utils/logger');
const { startScheduledJobs } = require('./utils/scheduler');

const app = express();

// Trust proxy for accurate IP addresses behind reverse proxy
app.set('trust proxy', 1);

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
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(compression());

// Prevent NoSQL injection attacks
app.use(mongoSanitize({
  allowDots: true,
  replaceWith: '_'
}));

// CORS configuration with security
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Enhanced rate limiting with different tiers
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.round((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
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
const mongooseOptions = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  bufferCommands: false, // Disable mongoose buffering
};

mongoose.connect(process.env.MONGODB_URI, mongooseOptions)
.then(() => {
  logger.info('Connected to MongoDB');
  // Start scheduled jobs after DB connection
  if (process.env.NODE_ENV === 'production') {
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
  if (process.env.NODE_ENV === 'production') {
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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;

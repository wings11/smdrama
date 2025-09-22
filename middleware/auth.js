const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger } = require('../utils/logger');

// Authentication middleware with enhanced security
const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided, authorization denied' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token || token.length < 10) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token has expired' });
      }
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      }
      throw jwtError;
    }

    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      logger.warn(`Authentication attempt with non-existent user ID: ${decoded.userId}`);
      return res.status(401).json({ error: 'Token is not valid' });
    }

    if (!user.isActive) {
      logger.warn(`Authentication attempt with deactivated account: ${user.email}`);
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Check if token was issued before any recent password change
    if (user.passwordChangedAt && decoded.iat < user.passwordChangedAt.getTime() / 1000) {
      logger.warn(`Authentication attempt with old token after password change: ${user.email}`);
      return res.status(401).json({ error: 'Token is no longer valid. Please login again.' });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Token is not valid' });
  }
};

// Admin role middleware
const adminAuth = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }
    next();
  } catch (error) {
    logger.error('Admin auth middleware error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Client role middleware
const clientAuth = async (req, res, next) => {
  try {
    if (req.user.role !== 'client' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Client or admin role required.' });
    }
    next();
  } catch (error) {
    logger.error('Client auth middleware error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  auth,
  adminAuth,
  clientAuth
};

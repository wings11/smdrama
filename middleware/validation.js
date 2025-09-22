const { body, validationResult } = require('express-validator');

// Validation rules for movie creation/update
const validateMovie = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  
  body('type')
    .isIn(['movie', 'series'])
    .withMessage('Type must be either movie or series'),
  
  body('telegramLink')
    .isURL()
    .withMessage('Must be a valid URL')
    .custom((value) => {
      if (!/^https:\/\/(t\.me|telegram\.me)\//.test(value)) {
        throw new Error('Must be a valid Telegram link');
      }
      return true;
    }),
  
  body('year')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 5 })
    .withMessage('Year must be between 1900 and current year + 5'),
  
  body('rating')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('Rating must be between 0 and 10'),
  
  body('imdbRating')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('IMDb rating must be between 0 and 10'),
  
  body('tmdbRating')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('TMDB rating must be between 0 and 10'),
  
  body('rottenTomatoesRating')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Rotten Tomatoes rating must be between 0 and 100'),
  
  body('metacriticRating')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Metacritic rating must be between 0 and 100'),
  
  body('posterUrl')
    .custom((value) => {
      if (!value || value.trim() === '') return true;
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error('Poster URL must be a valid URL');
      }
    }),
  
  body('trailerUrl')
    .custom((value) => {
      if (!value || value.trim() === '') return true;
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error('Trailer URL must be a valid URL');
      }
    }),
  
  body('backdropUrl')
    .custom((value) => {
      if (!value || value.trim() === '') return true;
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error('Backdrop URL must be a valid URL');
      }
    }),
  
  body('seasons')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Seasons must be at least 1'),
  
  body('episodes')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Episodes must be at least 1'),
  
  body('genre')
    .optional()
    .isArray()
    .withMessage('Genre must be an array'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean'),
  
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
  
  body('language')
    .optional()
    .isString()
    .withMessage('Language must be a string')
];

// Validation rules for user registration/update
const validateUser = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('role')
    .isIn(['admin', 'client'])
    .withMessage('Role must be either admin or client')
];

// Validation rules for login
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Middleware to check validation results
const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

module.exports = {
  validateMovie,
  validateUser,
  validateLogin,
  checkValidation
};

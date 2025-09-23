# Translated Movies Backend

A robust Node.js backend for a translated movies and series website where users can browse content and get redirected to Telegram channels.

## Features

- **Public API**: Browse movies/series without authentication
- **Admin Dashboard**: Upload and manage content
- **Client Analytics**: View click statistics and analytics
- **High Performance**: Redis caching, rate limiting, and optimization
- **Security**: JWT authentication, input validation, and security headers
- **Analytics**: Detailed click tracking and reporting

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Cache**: Redis
- **Authentication**: JWT
- **Logging**: Winston
- **Validation**: Joi, express-validator

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB
- Redis (optional, for caching)

### Installation

1. Clone and navigate to the project:
```bash
cd translated-movies-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start MongoDB and Redis (if available)

5. Seed the database:
```bash
npm run seed
```

6. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Public Endpoints (No Authentication Required)

- `GET /api/movies` - Get all active movies with pagination
- `GET /api/movies/featured` - Get featured movies
- `GET /api/movies/popular` - Get popular movies by clicks
- `GET /api/movies/:id` - Get single movie details
- `GET /api/movies/slug/:slug` - Get movie by slug
- `POST /api/movies/:id/click` - Record click and get Telegram link

### Authentication

- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

### Admin Endpoints (Admin Authentication Required)

- `GET /api/admin/dashboard` - Get admin dashboard stats
- `GET /api/admin/movies` - Get all movies (including inactive)
- `POST /api/admin/movies` - Create new movie
- `PUT /api/admin/movies/:id` - Update movie
- `DELETE /api/admin/movies/:id` - Soft delete movie
- `PUT /api/admin/movies/:id/feature` - Toggle featured status
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users` - Create new user
- `PUT /api/admin/users/:id/toggle-status` - Toggle user status

### Client Endpoints (Client Authentication Required)

- `GET /api/client/dashboard` - Get client dashboard
- `GET /api/client/movies/analytics` - Get movies with analytics
- `GET /api/client/movies/:id/clicks` - Get detailed click data

### Analytics Endpoints (Authentication Required)

- `GET /api/analytics/overview` - Get analytics overview
- `GET /api/analytics/movies/top` - Get top movies by clicks
- `GET /api/analytics/clicks/hourly` - Get hourly click distribution
- `GET /api/analytics/movies/:id/stats` - Get detailed movie stats

## Database Models

### User
- email, password, role (admin/client), isActive, lastLogin, createdBy

### Movie
- title, originalTitle, type (movie/series), year, genre, language
- description, telegramLink, thumbnailUrl, rating, duration
- seasons, episodes (for series)
- clickCount, lastClicked, isActive, isFeatured
- uploadedBy, slug, tags

### Click
- movieId, userAgent, ipAddress, referer, timestamp
- country, city (optional geo data)

## Authentication & Authorization

- **JWT Tokens**: Secure authentication with configurable expiration
- **Role-based Access**: Admin and Client roles with different permissions
- **Password Security**: Bcrypt hashing with salt rounds

## Performance Optimizations

- **Redis Caching**: Automatic caching of frequently accessed data
- **Database Indexing**: Optimized queries with proper indexes
- **Rate Limiting**: Prevent API abuse
- **Compression**: Gzip compression for responses
- **Pagination**: Efficient data loading

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Input Validation**: Request validation and sanitization
- **Error Handling**: Secure error responses
- **Logging**: Comprehensive request and error logging

## Environment Variables

```bash
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/translated-movies
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=30d
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=password
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=http://localhost:3000
```

### Upstash Redis (optional)

If you use Upstash for distributed rate limiting or caching, prefer providing the Redis TLS URI in `REDIS_URL` (recommended). Example:

```bash
REDIS_URL=redis://default:password@present-toad-8367.upstash.io:6379
```

Upstash also exposes a REST API (HTTP) with a REST URL and token. The current rate-limiter implementation expects a Redis connection string (the Redis/TLS URI). If you only have the REST URL & token and cannot provide the Redis URI, tell me and I will switch the limiter to a REST-based integration instead.


## Default Login Credentials

After running the seed script:

- **Admin**: admin@translatedmovies.com / admin123456
- **Client**: client@translatedmovies.com / client123456

## Deployment

1. Set environment variables for production
2. Ensure MongoDB and Redis are accessible
3. Run `npm start`
4. Set up reverse proxy (nginx) for SSL and load balancing

## License

MIT License

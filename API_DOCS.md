# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
Most endpoints require JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Rate Limits
- Public endpoints: 200 requests per 15 minutes
- Auth endpoints: 10 requests per 15 minutes  
- Admin/Client endpoints: 50 requests per 15 minutes

---

## Public Endpoints

### GET /movies
Get all active movies with pagination

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `type` (string): Filter by type ('movie' or 'series')
- `search` (string): Search in title/description
- `sortBy` (string): Sort field (default: 'createdAt')
- `sortOrder` (string): 'asc' or 'desc' (default: 'desc')

**Example:**
```
GET /api/movies?page=1&limit=10&type=movie&search=batman
```

### GET /movies/featured
Get featured movies

**Query Parameters:**
- `limit` (number): Max results (default: 10)

### GET /movies/popular
Get popular movies by click count

**Query Parameters:**
- `limit` (number): Max results (default: 10)
- `type` (string): Filter by type

### GET /movies/:id
Get single movie details

### GET /movies/slug/:slug
Get movie by slug

### POST /movies/:id/click
Record click and get Telegram link

**Response:**
```json
{
  "success": true,
  "telegramLink": "https://t.me/channel/123",
  "title": "Movie Title"
}
```

---

## Authentication Endpoints

### POST /auth/login
Login user

**Body:**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### GET /auth/me
Get current user info (requires auth)

### POST /auth/change-password
Change user password (requires auth)

**Body:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

---

## Admin Endpoints (Admin Auth Required)

### GET /admin/dashboard
Get admin dashboard statistics

### GET /admin/movies
Get all movies (including inactive) with admin details

### POST /admin/movies
Create new movie

**Body:**
```json
{
  "title": "Movie Title",
  "originalTitle": "Original Title",
  "type": "movie",
  "year": 2023,
  "genre": ["Action", "Drama"],
  "language": "Myanmar",
  "description": "Movie description",
  "telegramLink": "https://t.me/channel/123",
  "rating": 8.5,
  "duration": "2h 30m",
  "tags": ["action", "drama"]
}
```

### PUT /admin/movies/:id
Update movie (same body as create)

### DELETE /admin/movies/:id
Soft delete movie

### PUT /admin/movies/:id/feature
Toggle movie featured status

### GET /admin/users
Get all users

### POST /admin/users
Create new user

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "client"
}
```

### PUT /admin/users/:id/toggle-status
Toggle user active status

---

## Client Endpoints (Client Auth Required)

### GET /client/dashboard
Get client dashboard with basic stats

### GET /client/movies/analytics
Get movies with click analytics

**Query Parameters:**
- `page`, `limit`, `sortBy`, `sortOrder`, `type`, `search`

### GET /client/movies/:id/clicks
Get detailed click data for a movie

---

## Analytics Endpoints (Auth Required)

### GET /analytics/overview
Get overall analytics overview

**Query Parameters:**
- `days` (number): Number of days to analyze (default: 30)

### GET /analytics/movies/top
Get top movies by clicks

**Query Parameters:**
- `limit` (number): Max results (default: 20)
- `type` (string): Filter by type
- `days` (number): Time period filter

### GET /analytics/clicks/hourly
Get hourly click distribution

### GET /analytics/movies/:id/stats
Get detailed stats for a specific movie

---

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "error": "Error message"
}
```

Common HTTP status codes:
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error

---

## Response Format

Successful responses:
```json
{
  "success": true,
  "data": {},
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 100,
    "itemsPerPage": 20,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

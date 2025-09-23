# Production Deployment Checklist for Render

## 🚀 Pre-Deployment Checklist

### ✅ Security (Completed)
- [x] **NoSQL Injection Protection**: express-mongo-sanitize installed and configured
- [x] **XSS Protection**: Helmet.js with Content Security Policy configured
- [x] **CORS Protection**: Configured with specific origin validation
- [x] **Rate Limiting**: Enhanced rate limiting with IP detection
- [x] **Input Validation**: Comprehensive validation middleware
- [x] **Password Security**: bcrypt with salt rounds of 12
- [x] **JWT Security**: Secure token generation and validation
- [x] **Account Lockout**: Brute force protection implemented
- [x] **Error Handling**: Secure error responses without sensitive data leakage
- [x] **Logging Security**: Sanitized logs to prevent sensitive data exposure

### 📋 Environment Configuration

#### 1. Create Environment Variables in Render Dashboard

```bash
# Core Application
NODE_ENV=production
PORT=10000

# Database (MongoDB Atlas)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smmyanmar?retryWrites=true&w=majority

# Authentication
JWT_SECRET=<GENERATE_STRONG_SECRET>
JWT_EXPIRES_IN=30d

# API Keys
OMDB_API_KEY=your_omdb_api_key_here
TMDB_API_KEY=your_tmdb_api_key_here

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

#### 2. Generate Secure JWT Secret
Run this in Node.js console:
```javascript
require('crypto').randomBytes(64).toString('hex')
```

#### 3. MongoDB Atlas Setup
- [ ] Create MongoDB Atlas cluster
- [ ] Configure network access (add Render IP ranges or use 0.0.0.0/0 with strong auth)
- [ ] Create database user with read/write permissions
- [ ] Update connection string in environment variables

#### MongoDB Production Recommendations
- Use TLS/SSL (Atlas enforces TLS by default).
- Create a least-privilege database user (readWrite on your DB only).
- Configure IP access list to restrict connections from Render and your admin IPs.
- Enable backup and point-in-time recovery if available.
- Use connection string SRV format (provided by Atlas) and set a sensible `maxPoolSize`.
- Run the `scripts/createIndexes.js` script after initial deployment to create indexes for common queries:

```bash
node scripts/createIndexes.js
```

If you prefer to run index creation manually, run the commands in the Mongo shell or Atlas UI. Monitor index build times and avoid building large indexes during peak traffic.

### Upstash Redis (optional) - for rate limiting and caching

- Upstash offers two connection methods: a Redis URI (recommended for low-latency) and a REST API (HTTP).
- For the rate limiter we use a Redis connection. In Upstash, go to your database and copy the `Redis` connection string (looks like `redis://default:<password>@<host>:6379`).
- Set the value in Render as `REDIS_URL` (example):

```bash
REDIS_URL=redis://default:password@present-toad-8367.upstash.io:6379
```

- If you only have the Upstash REST URL & token and can't get the Redis URI, we can integrate the Upstash REST API (requires a different package). Let me know and I can wire the REST-based limiter instead.

### 🔧 Render Service Configuration

#### Build Command
```bash
npm install
```

#### Start Command
```bash
npm start
```

#### Health Check
- **Path**: `/health`
- **Expected Response**: `200 OK` with JSON `{"status": "healthy"}`

### 🚨 Security Verification

Before deploying, verify these security measures are active:

#### 1. Test Security Headers
After deployment, check headers with:
```bash
curl -I https://your-app.onrender.com/health
```

Expected headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 0`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

#### 2. Test Rate Limiting
Make rapid requests to verify rate limiting is working:
```bash
for i in {1..10}; do curl https://your-app.onrender.com/api/movies; done
```

#### 3. Test Authentication
Verify account lockout protection:
- Try logging in with wrong password 5+ times
- Confirm account gets locked temporarily

### 📊 Monitoring Setup

#### Application Metrics
- [ ] Monitor response times via Render dashboard
- [ ] Set up log monitoring for error patterns
- [ ] Monitor database connection health

#### Security Monitoring
- [ ] Monitor failed login attempts
- [ ] Track rate limit violations
- [ ] Monitor unusual API usage patterns

### 🔄 Post-Deployment Verification

#### 1. Core Functionality
- [ ] User authentication works
- [ ] Movie data loads correctly
- [ ] Admin features function properly
- [ ] API endpoints respond correctly

#### 2. Security Tests
- [ ] SQL injection attempts blocked
- [ ] XSS attempts blocked
- [ ] CORS policy enforced
- [ ] Rate limiting active
- [ ] Account lockout working

#### 3. Performance
- [ ] Response times acceptable (<2s)
- [ ] Database queries optimized
- [ ] Memory usage stable
- [ ] No memory leaks detected

### 📋 Final Steps

1. **Deploy to Render**
   ```bash
   git add .
   git commit -m "Production-ready with enhanced security"
   git push origin main
   ```

2. **Connect to Render**
   - Create new Web Service in Render dashboard
   - Connect to your GitHub repository
   - Set environment variables
   - Deploy

3. **Test Production Environment**
   - Run through complete user flow
   - Test all API endpoints
   - Verify security headers
   - Test rate limiting

4. **Monitor First 24 Hours**
   - Watch for any errors in logs
   - Monitor response times
   - Check for any security alerts

### 🆘 Rollback Plan

If issues occur:
1. Check Render logs for errors
2. Verify environment variables are set correctly
3. Check MongoDB Atlas connection
4. If critical issues, rollback to previous commit:
   ```bash
   git revert HEAD
   git push origin main
   ```

### 📞 Support Resources

- **Render Documentation**: https://render.com/docs
- **MongoDB Atlas Support**: https://docs.atlas.mongodb.com/
- **Security Best Practices**: See `SECURITY.md`

---

## ✨ Your application is now production-ready with enterprise-level security!

**Key Security Features Implemented:**
- ✅ NoSQL Injection Protection
- ✅ XSS/CSRF Protection  
- ✅ Account Brute Force Protection
- ✅ Comprehensive Input Validation
- ✅ Secure Password Handling
- ✅ JWT Token Security
- ✅ Rate Limiting
- ✅ Secure Headers
- ✅ Error Handling
- ✅ Audit Logging

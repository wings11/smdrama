/*
  Rate limiting has been temporarily disabled per admin request.
  This file now exports no-op middlewares so existing app.use(...) calls
  that reference strictRateLimit/moderateRateLimit/relaxedRateLimit will
  continue to work without throttling traffic.

  Re-enable rate limiting by restoring the previous implementation that
  uses express-rate-limit (and optionally Redis) and replacing these
  no-op functions.
*/

console.warn('Rate limiting disabled: strict/moderate/relaxed are now no-op middlewares.');

const noop = (req, res, next) => {
  // intentionally do nothing (no throttling)
  next();
};

const strictRateLimit = noop;
const moderateRateLimit = noop;
const relaxedRateLimit = noop;

module.exports = {
  strictRateLimit,
  moderateRateLimit,
  relaxedRateLimit,
};

function createRateLimiter({ windowMs, max }) {
  const clients = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of clients) if (value.resetAt <= now) clients.delete(key);
  }, windowMs);
  timer.unref();
  return (request, response, next) => {
    const key = request.ip;
    const now = Date.now();
    let record = clients.get(key);
    if (!record || record.resetAt <= now) record = { count: 0, resetAt: now + windowMs };
    record.count += 1;
    clients.set(key, record);
    response.set('RateLimit-Limit', String(max));
    response.set('RateLimit-Remaining', String(Math.max(0, max - record.count)));
    if (record.count > max) return response.status(429).json({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests; please try again later' } });
    next();
  };
}

module.exports = { createRateLimiter };

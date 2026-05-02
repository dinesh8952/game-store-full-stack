import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const signupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many signup attempts. Please try again after 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Per-user play rate limit: 30 plays/min per userId+IP — prevents shared network abuse (WiFi/PG)
export const playLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => {
    const ip = (req.ip ?? '').replace(/^::ffff:/, '');
    return `${req.user?.id ?? 'anon'}:${ip}`;
  },
  validate: { keyGeneratorIpFallback: false },
  message: { error: 'Too many play requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for authentication routes (login / register)
 * Mitigates brute-force credential stuffing and denial-of-service attempts
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: process.env.NODE_ENV === 'test' ? 1000 : 15, // limit each IP to 15 login/register attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.'
  },
  skip: () => process.env.NODE_ENV === 'test' // bypass in test mode
});

module.exports = {
  authLimiter
};

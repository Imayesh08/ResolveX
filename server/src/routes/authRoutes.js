const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  validateRegister,
  validateLogin,
  validatePasswordUpdate
} = require('../validators/authValidator');

// Public Authentication Endpoints (Guarded by rate limiter & validators)
router.post('/register', authLimiter, validateRegister, authController.register);
router.post('/login', authLimiter, validateLogin, authController.login);

// Protected Authentication Endpoints (Requires valid JWT)
router.get('/me', protect, authController.getMe);
router.patch('/update-password', protect, validatePasswordUpdate, authController.updatePassword);

module.exports = router;

const User = require('../models/User');
const { verifyToken } = require('../utils/jwt');

/**
 * Protect middleware: Ensures the incoming request includes a valid JWT token
 * in the Authorization header: `Bearer <token>`
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // 1) Extract token from Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in. Please provide a valid Bearer token to get access.'
      });
    }

    // 2) Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
          status: 'fail',
          message: 'Invalid authorization token.'
        });
      }
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'fail',
          message: 'Your session token has expired. Please log in again.'
        });
      }
      throw err;
    }

    // 3) Check if user still exists in the database
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token no longer exists.'
      });
    }

    // 4) Check if user account is active
    if (!currentUser.isActive) {
      return res.status(403).json({
        status: 'fail',
        message: 'This account has been deactivated. Please contact an administrator.'
      });
    }

    // 5) Grant access to protected route: attach user object
    req.user = currentUser;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-Based Authorization Middleware (RBAC)
 * Restricts access to specified user roles (e.g. 'admin', 'staff', 'customer')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: `Forbidden: Role '${req.user.role}' is not authorized to access this resource.`
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorize
};

const jwt = require('jsonwebtoken');

/**
 * Generate a signed JSON Web Token for an authenticated user
 * @param {string} userId - MongoDB User ObjectId
 * @param {string} role - User role ('customer' | 'staff' | 'admin')
 * @returns {string} Signed JWT token
 */
const signToken = (userId, role) => {
  const secret = process.env.JWT_SECRET || 'resolvex_cit_jwt_secret_key_secure_2026_exam';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      id: userId,
      role: role
    },
    secret,
    {
      expiresIn: expiresIn
    }
  );
};

/**
 * Verify a given JWT token
 * @param {string} token - JWT token string
 * @returns {object} Decoded token payload
 */
const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || 'resolvex_cit_jwt_secret_key_secure_2026_exam';
  return jwt.verify(token, secret);
};

module.exports = {
  signToken,
  verifyToken
};

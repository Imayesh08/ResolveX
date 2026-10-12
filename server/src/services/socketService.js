const { Server } = require('socket.io');
const User = require('../models/User');
const { verifyToken } = require('../utils/jwt');

let io = null;

/**
 * Initialize Socket.IO instance and attach to existing HTTP Server
 * @param {import('http').Server} httpServer
 * @returns {Server}
 */
const initSocket = (httpServer) => {
  const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5001'
  ];

  io = new Server(httpServer, {
    cors: {
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
          return callback(null, true);
        }
        return callback(new Error('CORS origin forbidden for Socket.IO'), false);
      },
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });

  // Authentication Middleware: Verify JWT before accepting connection
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      // Fallback: check authorization header
      if (!token && socket.handshake.headers?.authorization) {
        const authHeader = socket.handshake.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
          token = authHeader.split(' ')[1];
        }
      }

      if (!token) {
        return next(new Error('Authentication failed: Missing JWT token.'));
      }

      // Verify token signature and expiration
      let decoded;
      try {
        decoded = verifyToken(token);
      } catch (err) {
        return next(new Error('Authentication failed: Invalid or expired token.'));
      }

      // Lookup user in MongoDB to ensure active account
      const user = await User.findById(decoded.id).select('_id name email role isActive');
      if (!user) {
        return next(new Error('Authentication failed: User no longer exists.'));
      }

      if (!user.isActive) {
        return next(new Error('Authentication failed: User account is deactivated.'));
      }

      // Attach verified user to socket instance
      socket.user = {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      };

      next();
    } catch (error) {
      next(new Error(`Authentication failed: ${error.message}`));
    }
  });

  // Connection Handler: Join isolated private user room
  io.on('connection', (socket) => {
    const userRoom = `user:${socket.user._id}`;
    socket.join(userRoom);
    socket.join(`role:${socket.user.role}`);

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
};

/**
 * Access the active Socket.IO instance
 * @returns {Server|null}
 */
const getIO = () => io;

/**
 * Emit an event strictly to a specific user's private room
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {string} event
 * @param {object} payload
 * @returns {boolean}
 */
const emitToUser = (userId, event, payload) => {
  if (!io) return false;
  const uid = userId ? userId.toString() : '';
  if (!uid) return false;

  io.to(`user:${uid}`).emit(event, payload);
  return true;
};

/**
 * Emit an event strictly to all members of a role (e.g. 'admin', 'staff')
 * @param {string} role
 * @param {string} event
 * @param {object} payload
 * @returns {boolean}
 */
const emitToRole = (role, event, payload) => {
  if (!io) return false;
  io.to(`role:${role}`).emit(event, payload);
  return true;
};

/**
 * Gracefully close Socket.IO server
 */
const closeSocket = () => {
  if (io) {
    io.close();
    io = null;
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToRole,
  closeSocket
};

const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const { recordAudit } = require('../services/auditService');

/**
 * Register a new Customer
 * Note: Staff and Admin accounts can only be created by an Administrator
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if email is already registered
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        status: 'fail',
        message: 'An account with this email address already exists.'
      });
    }

    // Always enforce 'customer' role on public self-registration (prevents privilege escalation)
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password,
      phone: phone ? phone.trim() : '',
      role: 'customer'
    });

    // Generate JWT
    const token = signToken(newUser._id, newUser.role);

    // Hide password from response
    newUser.password = undefined;

    // Audit Logging
    await recordAudit({
      actor: newUser._id,
      actorRole: 'customer',
      action: 'USER_CREATED',
      resourceType: 'User',
      resourceId: newUser._id.toString(),
      description: `New customer account registered: ${newUser.email}`,
      changes: {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      },
      req
    }).catch((err) => console.error('Audit log recording failed:', err.message));

    res.status(201).json({
      status: 'success',
      message: 'Account created successfully',
      token,
      data: {
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          phone: newUser.phone,
          createdAt: newUser.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log in an existing user
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Explicitly include password because schema default is select: false
    const user = await User.findOne({ email: email ? email.toLowerCase().trim() : '' }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      // Record failed authentication attempt (never log raw password)
      await recordAudit({
        actor: null,
        actorRole: 'system',
        action: 'AUTH_LOGIN_FAILED',
        resourceType: 'Authentication',
        resourceId: email ? email.toLowerCase().trim() : 'unknown',
        description: `Failed login attempt for ${email || 'unknown'}`,
        outcome: 'FAILURE',
        metadata: {
          email: email ? email.toLowerCase().trim() : '',
          reason: 'Invalid credentials'
        },
        req
      }).catch((err) => console.error('Audit log recording failed:', err.message));

      return res.status(401).json({
        status: 'fail',
        message: 'Invalid email address or password.'
      });
    }

    if (!user.isActive) {
      await recordAudit({
        actor: user._id,
        actorRole: user.role,
        action: 'AUTH_LOGIN_FAILED',
        resourceType: 'Authentication',
        resourceId: user._id.toString(),
        description: `Deactivated account login attempt by ${user.email}`,
        outcome: 'FAILURE',
        metadata: {
          email: user.email,
          reason: 'Account deactivated'
        },
        req
      }).catch((err) => console.error('Audit log recording failed:', err.message));

      return res.status(403).json({
        status: 'fail',
        message: 'Your account is deactivated. Please contact support.'
      });
    }

    // Generate JWT
    const token = signToken(user._id, user.role);

    // Audit Logging
    await recordAudit({
      actor: user._id,
      actorRole: user.role,
      action: 'AUTH_LOGIN_SUCCESS',
      resourceType: 'Authentication',
      resourceId: user._id.toString(),
      description: `User ${user.email} (${user.role}) logged in successfully`,
      outcome: 'SUCCESS',
      metadata: {
        email: user.email
      },
      req
    }).catch((err) => console.error('Audit log recording failed:', err.message));

    // Exclude password from response payload
    user.password = undefined;

    res.status(200).json({
      status: 'success',
      message: 'Logged in successfully',
      token,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          phone: user.phone,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get profile of currently authenticated user
 */
const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          department: req.user.department,
          phone: req.user.phone,
          createdAt: req.user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update authenticated user's password
 */
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Fetch user with password field
    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Your current password is incorrect.'
      });
    }

    // Set new password (pre-save hook will hash it)
    user.password = newPassword;
    await user.save();

    // Re-issue a fresh token
    const token = signToken(user._id, user.role);

    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully.',
      token
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updatePassword
};

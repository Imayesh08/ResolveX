const User = require('../models/User');
const { recordAudit } = require('../services/auditService');

/**
 * Get all users with search, role filters, and pagination (Admin only)
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { role, department, search, page = 1, limit = 10 } = req.query;

    const query = {};

    if (role) {
      query.role = role;
    }

    if (department) {
      query.department = department;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [users, totalUsers] = await Promise.all([
      User.find(query)
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      User.countDocuments(query)
    ]);

    res.status(200).json({
      status: 'success',
      results: users.length,
      pagination: {
        total: totalUsers,
        page: pageNum,
        pages: Math.ceil(totalUsers / limitNum),
        limit: limitNum
      },
      data: {
        users
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get list of active support staff for complaint assignment (Admin & Staff)
 */
const getStaffList = async (req, res, next) => {
  try {
    const staffMembers = await User.find({ role: 'staff', isActive: true })
      .select('name email department phone')
      .sort({ name: 1 });

    res.status(200).json({
      status: 'success',
      results: staffMembers.length,
      data: {
        staff: staffMembers
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new user (Admin only: used to provision Staff and Admin accounts)
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department, phone } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        status: 'fail',
        message: 'A user with this email address already exists.'
      });
    }

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role || 'customer',
      department: department || 'General',
      phone: phone ? phone.trim() : ''
    });

    newUser.password = undefined;

    // Audit Logging
    await recordAudit({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'USER_CREATED',
      resourceType: 'User',
      resourceId: newUser._id.toString(),
      description: `Administrator ${req.user.name} provisioned user ${newUser.email} with role ${newUser.role}`,
      changes: {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department
      },
      req
    }).catch((err) => console.error('Audit log recording failed:', err.message));

    res.status(201).json({
      status: 'success',
      message: `${newUser.role.toUpperCase()} account created successfully.`,
      data: {
        user: newUser
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID (Admin or Self)
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'No user found with the provided ID.'
      });
    }

    // Only Admin can view other user profiles
    if (req.user.role !== 'admin' && req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'Forbidden: You cannot view profile details of another user.'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user details (Admin only)
 */
const updateUser = async (req, res, next) => {
  try {
    const { name, role, department, phone, isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'No user found with the provided ID.'
      });
    }

    const prev = {
      name: user.name,
      role: user.role,
      department: user.department,
      phone: user.phone,
      isActive: user.isActive
    };

    if (name !== undefined) user.name = name.trim();
    if (role !== undefined) user.role = role;
    if (department !== undefined) user.department = department;
    if (phone !== undefined) user.phone = phone.trim();
    if (isActive !== undefined) user.isActive = Boolean(isActive);

    await user.save();

    const changes = {};
    if (name !== undefined && name.trim() !== prev.name) changes.name = { before: prev.name, after: user.name };
    if (role !== undefined && role !== prev.role) changes.role = { before: prev.role, after: user.role };
    if (department !== undefined && department !== prev.department) changes.department = { before: prev.department, after: user.department };
    if (phone !== undefined && phone.trim() !== prev.phone) changes.phone = { before: prev.phone, after: user.phone };
    if (isActive !== undefined && Boolean(isActive) !== prev.isActive) changes.isActive = { before: prev.isActive, after: user.isActive };

    let action = 'USER_UPDATED';
    if (changes.role) action = 'USER_ROLE_CHANGED';
    else if (changes.isActive) action = 'USER_STATUS_CHANGED';

    await recordAudit({
      actor: req.user._id,
      actorRole: req.user.role,
      action,
      resourceType: 'User',
      resourceId: user._id.toString(),
      description: `User ${user.email} updated by administrator ${req.user.name}`,
      changes: Object.keys(changes).length > 0 ? changes : null,
      req
    }).catch((err) => console.error('Audit log recording failed:', err.message));

    res.status(200).json({
      status: 'success',
      message: 'User details updated successfully.',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deactivate or soft-delete user (Admin only)
 */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'No user found with the provided ID.'
      });
    }

    // Prevent admin from deleting their own account
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        status: 'fail',
        message: 'You cannot delete or deactivate your own admin account.'
      });
    }

    const prevActive = user.isActive;
    // Deactivate user (soft delete for audit persistence)
    user.isActive = false;
    await user.save();

    await recordAudit({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'USER_DELETED',
      resourceType: 'User',
      resourceId: user._id.toString(),
      description: `User account ${user.email} deactivated by administrator ${req.user.name}`,
      changes: {
        isActive: { before: prevActive, after: false }
      },
      req
    }).catch((err) => console.error('Audit log recording failed:', err.message));

    res.status(200).json({
      status: 'success',
      message: 'User account deactivated successfully.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getStaffList,
  createUser,
  getUserById,
  updateUser,
  deleteUser
};

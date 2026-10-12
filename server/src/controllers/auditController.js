const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');
const Complaint = require('../models/Complaint');

/**
 * Get system-wide audit logs with filters, search, and pagination (Admin only)
 * GET /api/v1/audit-logs
 */
const getAuditLogs = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'fail',
        message: 'Forbidden: Admin privilege required to view system audit logs.'
      });
    }

    const {
      action,
      resourceType,
      outcome,
      actor,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};

    if (action) query.action = action;
    if (resourceType) query.resourceType = resourceType;
    if (outcome) query.outcome = outcome;

    if (actor && mongoose.Types.ObjectId.isValid(actor)) {
      query.actor = actor;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { resourceId: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [logs, totalLogs, summaryStats] = await Promise.all([
      AuditLog.find(query)
        .populate('actor', 'name email role department')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      AuditLog.countDocuments(query),
      Promise.all([
        AuditLog.countDocuments(),
        AuditLog.countDocuments({ resourceType: 'Complaint' }),
        AuditLog.countDocuments({ resourceType: 'User' }),
        AuditLog.countDocuments({ action: 'AUTH_LOGIN_FAILED' })
      ])
    ]);

    const [totalEvents, complaintEvents, userEvents, authFailures] = summaryStats;

    res.status(200).json({
      status: 'success',
      results: logs.length,
      pagination: {
        total: totalLogs,
        page: pageNum,
        pages: Math.ceil(totalLogs / limitNum) || 1,
        limit: limitNum
      },
      summary: {
        totalEvents,
        complaintEvents,
        userEvents,
        authFailures
      },
      data: {
        logs
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get summary metrics for the audit log dashboard (Admin only)
 * GET /api/v1/audit-logs/metrics
 */
const getAuditMetrics = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'fail',
        message: 'Forbidden: Admin privilege required to view audit metrics.'
      });
    }

    const [totalEvents, complaintEvents, userEvents, authFailures, actionCounts] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ resourceType: 'Complaint' }),
      AuditLog.countDocuments({ resourceType: 'User' }),
      AuditLog.countDocuments({ action: 'AUTH_LOGIN_FAILED' }),
      AuditLog.aggregate([
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        totalEvents,
        complaintEvents,
        userEvents,
        authFailures,
        actionCounts
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get chronological audit history for a specific complaint
 * GET /api/v1/complaints/:id/audit-trail
 */
const getComplaintAuditTrail = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid complaint ID format.'
      });
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({
        status: 'fail',
        message: 'Complaint record not found.'
      });
    }

    // Role-based scoping: Customers can only inspect their own complaint history
    if (
      req.user.role === 'customer' &&
      complaint.customer.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        status: 'fail',
        message: 'Forbidden: You do not have permission to view audit logs for this complaint.'
      });
    }

    // Query audit logs associated with this complaint
    const query = {
      resourceType: 'Complaint',
      resourceId: complaint._id.toString()
    };

    const logs = await AuditLog.find(query)
      .populate('actor', 'name email role department')
      .sort({ createdAt: -1 });

    // Sanitize logs for customers (hide internal staff actions if any)
    const sanitizedLogs = logs.map((log) => {
      const obj = log.toObject();
      if (req.user.role === 'customer') {
        // Customer view: hide internal metadata details
        delete obj.metadata?.ip;
        delete obj.metadata?.method;
        delete obj.metadata?.path;
      }
      return obj;
    });

    res.status(200).json({
      status: 'success',
      results: sanitizedLogs.length,
      data: {
        auditTrail: sanitizedLogs
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs,
  getAuditMetrics,
  getComplaintAuditTrail
};

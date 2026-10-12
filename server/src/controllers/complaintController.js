const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { createNotification, notifyAdmins } = require('../services/notificationService');
const { recordAudit } = require('../services/auditService');

/**
 * Submit a new Complaint (Customer only or Admin on behalf of Customer)
 */
const createComplaint = async (req, res, next) => {
  try {
    const { title, description, category, priority } = req.body;

    const complaint = await Complaint.create({
      title: title.trim(),
      description: description.trim(),
      category,
      priority: priority || 'MEDIUM',
      status: 'OPEN',
      customer: req.user._id
    });

    const populatedComplaint = await Complaint.findById(complaint._id)
      .populate('customer', 'name email phone');

    // Real-Time Notification Workflow:
    // 1) Confirm to customer
    createNotification({
      recipient: complaint.customer,
      complaint: complaint._id,
      type: 'COMPLAINT_CREATED',
      title: 'Complaint Logged Successfully',
      message: `Your complaint #${complaint.ticketNumber} "${complaint.title}" has been registered.`
    }).catch((err) => console.error('Notification error (customer create):', err.message));

    // 2) Alert administrators of new complaint
    notifyAdmins({
      complaint: complaint._id,
      type: 'COMPLAINT_CREATED',
      title: 'New Complaint Submitted',
      message: `New complaint #${complaint.ticketNumber} submitted by ${req.user.name}.`,
      excludeUserId: req.user._id
    }).catch((err) => console.error('Notification error (admin create):', err.message));

    // Audit Logging
    await recordAudit({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'COMPLAINT_CREATED',
      resourceType: 'Complaint',
      resourceId: complaint._id,
      description: `Complaint #${complaint.ticketNumber} created with priority ${complaint.priority}`,
      changes: {
        ticketNumber: complaint.ticketNumber,
        title: complaint.title,
        category: complaint.category,
        priority: complaint.priority,
        status: complaint.status
      },
      req
    }).catch((err) => console.error('Audit log recording failed:', err.message));

    res.status(201).json({
      status: 'success',
      message: 'Complaint submitted successfully.',
      data: {
        complaint: populatedComplaint
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all complaints with role scoping, search, filters & pagination
 */
const getAllComplaints = async (req, res, next) => {
  try {
    const {
      status,
      priority,
      category,
      assignedTo,
      search,
      page = 1,
      limit = 10,
      includeArchived
    } = req.query;

    const query = {};

    // 1) Role-based scoping (Strict Customer Isolation)
    if (req.user.role === 'customer') {
      query.customer = req.user._id;
      query.isArchived = false;
    } else if (req.user.role === 'staff') {
      // Support Staff: can filter by their assigned complaints or view all unarchived
      if (assignedTo === 'me') {
        query.assignedTo = req.user._id;
      } else if (assignedTo) {
        query.assignedTo = assignedTo;
      }
      query.isArchived = false;
    } else if (req.user.role === 'admin') {
      // Admin can view everything and optionally include archived records
      if (assignedTo) {
        query.assignedTo = assignedTo;
      }
      if (includeArchived !== 'true') {
        query.isArchived = false;
      }
    }

    // 2) Optional attribute filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;

    // 3) Full-text search on ticketNumber, title, and description
    if (search) {
      query.$or = [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // 4) Pagination setup
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [complaints, totalComplaints] = await Promise.all([
      Complaint.find(query)
        .populate('customer', 'name email phone')
        .populate('assignedTo', 'name email department')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Complaint.countDocuments(query)
    ]);

    res.status(200).json({
      status: 'success',
      results: complaints.length,
      pagination: {
        total: totalComplaints,
        page: pageNum,
        pages: Math.ceil(totalComplaints / limitNum),
        limit: limitNum
      },
      data: {
        complaints
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Complaint details by ID with populated references and audit trail
 */
const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('assignedTo', 'name email department')
      .populate('statusHistory.changedBy', 'name role')
      .populate('notes.author', 'name role')
      .populate('resolution.resolvedBy', 'name role')
      .populate('duplicateOf', 'ticketNumber title status category customer')
      .populate('duplicateMarkedBy', 'name role')
      .populate({
        path: 'linkedDuplicates',
        select: 'ticketNumber title status category customer createdAt duplicateReason duplicateMarkedAt'
      });

    if (!complaint) {
      return res.status(404).json({
        status: 'fail',
        message: 'No complaint found with this ID.'
      });
    }

    // Customer Isolation Check
    if (
      req.user.role === 'customer' &&
      complaint.customer._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        status: 'fail',
        message: 'Forbidden: You do not have permission to view this complaint.'
      });
    }

    // Internal Notes Sanitization: Customers must not see staff-only internal notes
    let sanitizedComplaint = complaint.toObject();
    if (req.user.role === 'customer') {
      sanitizedComplaint.notes = sanitizedComplaint.notes.filter(
        (n) => n.isInternal === false
      );
    }

    res.status(200).json({
      status: 'success',
      data: {
        complaint: sanitizedComplaint
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update complaint details (Customer can edit if OPEN; Admin can edit anytime)
 */
const updateComplaint = async (req, res, next) => {
  try {
    const { title, description, category, priority } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        status: 'fail',
        message: 'No complaint found with this ID.'
      });
    }

    const prevData = {
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      priority: complaint.priority
    };

    // Role verification
    if (req.user.role === 'customer') {
      if (complaint.customer.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          status: 'fail',
          message: 'Forbidden: You do not have permission to modify this complaint.'
        });
      }
      if (complaint.status !== 'OPEN') {
        return res.status(400).json({
          status: 'fail',
          message: 'Customers can only edit complaints while they remain in OPEN status.'
        });
      }
      if (title) complaint.title = title.trim();
      if (description) complaint.description = description.trim();
      if (category) complaint.category = category;
    } else if (req.user.role === 'admin') {
      if (title) complaint.title = title.trim();
      if (description) complaint.description = description.trim();
      if (category) complaint.category = category;
      if (priority) complaint.priority = priority;
    } else {
      return res.status(403).json({
        status: 'fail',
        message: 'Staff members cannot directly alter complaint core information.'
      });
    }

    await complaint.save();

    // Construct change diff
    const changes = {};
    if (title && title.trim() !== prevData.title) {
      changes.title = { before: prevData.title, after: complaint.title };
    }
    if (description && description.trim() !== prevData.description) {
      changes.description = { before: prevData.description, after: complaint.description };
    }
    if (category && category !== prevData.category) {
      changes.category = { before: prevData.category, after: complaint.category };
    }
    if (priority && priority !== prevData.priority) {
      changes.priority = { before: prevData.priority, after: complaint.priority };
    }

    const action = changes.priority ? 'COMPLAINT_PRIORITY_CHANGED' : 'COMPLAINT_UPDATED';

    await recordAudit({
      actor: req.user._id,
      actorRole: req.user.role,
      action,
      resourceType: 'Complaint',
      resourceId: complaint._id,
      description: changes.priority
        ? `Complaint #${complaint.ticketNumber} priority changed to ${complaint.priority}`
        : `Complaint #${complaint.ticketNumber} updated by ${req.user.name}`,
      changes: Object.keys(changes).length > 0 ? changes : null,
      req
    }).catch((err) => console.error('Audit log recording failed:', err.message));

    const updated = await Complaint.findById(complaint._id)
      .populate('customer', 'name email phone')
      .populate('assignedTo', 'name email department');

    res.status(200).json({
      status: 'success',
      message: 'Complaint updated successfully.',
      data: {
        complaint: updated
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign complaint to support staff (Admin only)
 */
const assignComplaint = async (req, res, next) => {
  try {
    const { staffId, notes } = req.body;

    if (!staffId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Staff member ID is required for assignment.'
      });
    }

    // Validate staff member exists and has 'staff' role
    const staffMember = await User.findOne({ _id: staffId, role: 'staff', isActive: true });
    if (!staffMember) {
      return res.status(404).json({
        status: 'fail',
        message: 'Active support staff member not found with this ID.'
      });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        status: 'fail',
        message: 'No complaint found with this ID.'
      });
    }

    const prevAssignee = complaint.assignedTo;
    const prevStatus = complaint.status;
    complaint.assignedTo = staffMember._id;

    // Advance status to ASSIGNED if currently OPEN
    if (complaint.status === 'OPEN') {
      complaint.status = 'ASSIGNED';
    }

    complaint.statusHistory.push({
      status: complaint.status,
      changedBy: req.user._id,
      notes: notes || `Assigned to ${staffMember.name} (${staffMember.department})`,
      changedAt: new Date()
    });

    await complaint.save();

    // Audit Logging
    await recordAudit({
      actor: req.user._id,
      actorRole: req.user.role,
      action: prevAssignee ? 'COMPLAINT_REASSIGNED' : 'COMPLAINT_ASSIGNED',
      resourceType: 'Complaint',
      resourceId: complaint._id,
      description: `Complaint #${complaint.ticketNumber} assigned to ${staffMember.name} (${staffMember.department})`,
      changes: {
        assignedTo: {
          before: prevAssignee ? prevAssignee.toString() : null,
          after: staffMember._id.toString()
        },
        status: {
          before: prevStatus,
          after: complaint.status
        }
      },
      req
    }).catch((err) => console.error('Audit log recording failed:', err.message));

    const updated = await Complaint.findById(complaint._id)
      .populate('customer', 'name email phone')
      .populate('assignedTo', 'name email department')
      .populate('statusHistory.changedBy', 'name role');

    // Real-Time Notification Workflow:
    // 1) Alert assigned staff member
    createNotification({
      recipient: staffMember._id,
      complaint: complaint._id,
      type: 'COMPLAINT_ASSIGNED',
      title: 'New Complaint Assignment',
      message: `You have been assigned to investigate complaint #${complaint.ticketNumber} (${complaint.priority}).`
    }).catch((err) => console.error('Notification error (staff assign):', err.message));

    // 2) Inform complaint owner (customer)
    createNotification({
      recipient: complaint.customer,
      complaint: complaint._id,
      type: 'COMPLAINT_ASSIGNED',
      title: 'Support Specialist Assigned',
      message: `Your complaint #${complaint.ticketNumber} has been assigned to specialist ${staffMember.name}.`
    }).catch((err) => console.error('Notification error (customer assign):', err.message));

    res.status(200).json({
      status: 'success',
      message: `Complaint assigned to ${staffMember.name} successfully.`,
      data: {
        complaint: updated
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Transition complaint status and record audit history
 */
const updateStatus = async (req, res, next) => {
  try {
    const { status, notes, resolutionDescription } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        status: 'fail',
        message: 'No complaint found with this ID.'
      });
    }

    // Customer permissions: can only reopen resolved/closed complaints
    if (req.user.role === 'customer') {
      if (complaint.customer.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          status: 'fail',
          message: 'Forbidden: You cannot modify this complaint.'
        });
      }
      if (!['RESOLVED', 'CLOSED'].includes(complaint.status)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Customers can only change status to reopen resolved or closed complaints.'
        });
      }
      if (status !== 'OPEN') {
        return res.status(400).json({
          status: 'fail',
          message: 'To reopen a complaint, status must be set to OPEN.'
        });
      }
    }

    // Support staff check: must be assigned to this complaint or admin
    if (
      req.user.role === 'staff' &&
      complaint.assignedTo &&
      complaint.assignedTo.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        status: 'fail',
        message: 'Forbidden: You are not assigned to investigate this complaint.'
      });
    }

    const previousStatus = complaint.status;
    complaint.status = status;

    // Handle Resolution details
    if (status === 'RESOLVED') {
      complaint.resolution = {
        description: resolutionDescription.trim(),
        resolvedAt: new Date(),
        resolvedBy: req.user._id
      };
    } else if (previousStatus === 'RESOLVED' && status === 'OPEN') {
      // Reopened complaint
      complaint.resolution = {
        description: '',
        resolvedAt: null,
        resolvedBy: null
      };
    }

    // Append to status history audit trail
    complaint.statusHistory.push({
      status,
      changedBy: req.user._id,
      notes: notes || `Status changed from ${previousStatus} to ${status}`,
      changedAt: new Date()
    });

    await complaint.save();

    // Audit Logging
    const isReopened = (req.user.role === 'customer' && status === 'OPEN');
    const auditAction = isReopened ? 'COMPLAINT_REOPENED' : 'COMPLAINT_STATUS_CHANGED';

    await recordAudit({
      actor: req.user._id,
      actorRole: req.user.role,
      action: auditAction,
      resourceType: 'Complaint',
      resourceId: complaint._id,
      description: isReopened
        ? `Complaint #${complaint.ticketNumber} reopened by customer`
        : `Complaint #${complaint.ticketNumber} status changed from ${previousStatus} to ${status}`,
      changes: {
        status: {
          before: previousStatus,
          after: status
        },
        notes: notes || null
      },
      req
    }).catch((err) => console.error('Audit log recording failed:', err.message));

    const updated = await Complaint.findById(complaint._id)
      .populate('customer', 'name email phone')
      .populate('assignedTo', 'name email department')
      .populate('statusHistory.changedBy', 'name role')
      .populate('resolution.resolvedBy', 'name role');

    // Real-Time Notification Workflow:
    if (req.user.role === 'customer') {
      // Customer reopened the complaint
      if (complaint.assignedTo) {
        createNotification({
          recipient: complaint.assignedTo,
          complaint: complaint._id,
          type: 'STATUS_CHANGED',
          title: 'Complaint Reopened by Customer',
          message: `Customer ${req.user.name} reopened complaint #${complaint.ticketNumber}.`
        }).catch((err) => console.error('Notification error (reopen staff):', err.message));
      }
      notifyAdmins({
        complaint: complaint._id,
        type: 'STATUS_CHANGED',
        title: 'Complaint Reopened',
        message: `Customer ${req.user.name} reopened complaint #${complaint.ticketNumber}.`,
        excludeUserId: req.user._id
      }).catch((err) => console.error('Notification error (reopen admins):', err.message));
    } else {
      // Staff or Admin changed status -> notify customer
      const isResolved = status === 'RESOLVED';
      createNotification({
        recipient: complaint.customer,
        complaint: complaint._id,
        type: 'STATUS_CHANGED',
        title: isResolved ? 'Complaint Resolved' : 'Complaint Status Updated',
        message: isResolved
          ? `Your complaint #${complaint.ticketNumber} has been resolved.`
          : `Status for complaint #${complaint.ticketNumber} changed to ${status}.`
      }).catch((err) => console.error('Notification error (status customer):', err.message));

      // If admin changed status and staff is assigned, notify assigned staff
      if (req.user.role === 'admin' && complaint.assignedTo && complaint.assignedTo.toString() !== req.user._id.toString()) {
        createNotification({
          recipient: complaint.assignedTo,
          complaint: complaint._id,
          type: 'STATUS_CHANGED',
          title: 'Assigned Complaint Status Changed',
          message: `Admin updated status of complaint #${complaint.ticketNumber} to ${status}.`
        }).catch((err) => console.error('Notification error (status staff):', err.message));
      }
    }

    res.status(200).json({
      status: 'success',
      message: `Status updated to ${status} successfully.`,
      data: {
        complaint: updated
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add communication or investigation note
 */
const addNote = async (req, res, next) => {
  try {
    const { note, isInternal = false } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        status: 'fail',
        message: 'No complaint found with this ID.'
      });
    }

    // Permission checks
    if (req.user.role === 'customer') {
      if (complaint.customer.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          status: 'fail',
          message: 'Forbidden: You cannot comment on another customer\'s complaint.'
        });
      }
    }

    // Force isInternal = false for customer
    const noteVisibility = req.user.role === 'customer' ? false : Boolean(isInternal);

    complaint.notes.push({
      author: req.user._id,
      note: note.trim(),
      isInternal: noteVisibility,
      createdAt: new Date()
    });

    await complaint.save();

    const updated = await Complaint.findById(complaint._id)
      .populate('notes.author', 'name role');

    // Real-Time Notification Workflow (Only for customer-visible responses, keep internal notes private)
    if (!noteVisibility) {
      if (req.user.role === 'customer') {
        // Customer commented -> notify assigned staff and admins
        if (complaint.assignedTo) {
          createNotification({
            recipient: complaint.assignedTo,
            complaint: complaint._id,
            type: 'NEW_RESPONSE',
            title: 'New Customer Response',
            message: `Customer ${req.user.name} posted a comment on complaint #${complaint.ticketNumber}.`
          }).catch((err) => console.error('Notification error (note staff):', err.message));
        }
        notifyAdmins({
          complaint: complaint._id,
          type: 'NEW_RESPONSE',
          title: 'Customer Added Response',
          message: `Customer ${req.user.name} commented on complaint #${complaint.ticketNumber}.`,
          excludeUserId: req.user._id
        }).catch((err) => console.error('Notification error (note admin):', err.message));
      } else {
        // Staff or admin posted public response -> notify customer
        createNotification({
          recipient: complaint.customer,
          complaint: complaint._id,
          type: 'NEW_RESPONSE',
          title: 'New Response from Support Team',
          message: `A new response was posted on your complaint #${complaint.ticketNumber}.`
        }).catch((err) => console.error('Notification error (note customer):', err.message));
      }
    }

    res.status(201).json({
      status: 'success',
      message: 'Note added successfully.',
      data: {
        notes: updated.notes
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft-delete / Archive complaint (Admin only)
 */
const archiveComplaint = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        status: 'fail',
        message: 'No complaint found with this ID.'
      });
    }

    complaint.isArchived = true;
    await complaint.save();

    // Audit Logging
    await recordAudit({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'COMPLAINT_ARCHIVED',
      resourceType: 'Complaint',
      resourceId: complaint._id,
      description: `Complaint #${complaint.ticketNumber} archived by administrator`,
      changes: {
        isArchived: { before: false, after: true }
      },
      req
    }).catch((err) => console.error('Audit log recording failed:', err.message));

    res.status(200).json({
      status: 'success',
      message: 'Complaint archived successfully.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Dashboard Analytics & Resolution Statistics (Admin & Staff)
 */
const getComplaintStats = async (req, res, next) => {
  try {
    // Base match: active unarchived complaints
    const matchFilter = { isArchived: false };

    // If staff, can optionally restrict to their assigned complaints
    if (req.user.role === 'staff' && req.query.mine === 'true') {
      matchFilter.assignedTo = req.user._id;
    }

    const [
      total,
      statusCounts,
      priorityCounts,
      categoryCounts,
      recentComplaints
    ] = await Promise.all([
      Complaint.countDocuments(matchFilter),
      Complaint.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Complaint.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      Complaint.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      Complaint.find(matchFilter)
        .populate('customer', 'name email')
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    // Format aggregate arrays into clean objects
    const byStatus = {
      OPEN: 0,
      ASSIGNED: 0,
      IN_PROGRESS: 0,
      WAITING_FOR_CUSTOMER: 0,
      RESOLVED: 0,
      CLOSED: 0
    };
    statusCounts.forEach((item) => {
      byStatus[item._id] = item.count;
    });

    const byPriority = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      URGENT: 0
    };
    priorityCounts.forEach((item) => {
      byPriority[item._id] = item.count;
    });

    const byCategory = {};
    categoryCounts.forEach((item) => {
      byCategory[item._id] = item.count;
    });

    const resolvedOrClosed = (byStatus.RESOLVED || 0) + (byStatus.CLOSED || 0);
    const resolutionRate = total > 0 ? Math.round((resolvedOrClosed / total) * 100) : 0;

    res.status(200).json({
      status: 'success',
      data: {
        totalComplaints: total,
        resolutionRate: `${resolutionRate}%`,
        byStatus,
        byPriority,
        byCategory,
        recentComplaints
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComplaint,
  getAllComplaints,
  getComplaintById,
  updateComplaint,
  assignComplaint,
  updateStatus,
  addNote,
  archiveComplaint,
  getComplaintStats
};

const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const { recordAudit } = require('../services/auditService');
const { findDuplicates, DEFAULT_CONFIG } = require('../services/duplicateDetectionService');
const { VALID_CATEGORIES } = require('../validators/complaintValidator');

/**
 * Check for potential duplicate complaints before submission
 * POST /api/v1/complaints/check-duplicates
 */
const checkDuplicates = async (req, res, next) => {
  try {
    const { title, description, category, excludeComplaintId } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 5) {
      return res.status(400).json({
        status: 'fail',
        message: 'Title is required (minimum 5 characters) to perform duplicate check.'
      });
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        status: 'fail',
        message: `Category must be one of: ${VALID_CATEGORIES.join(', ')}`
      });
    }

    // Candidate Lookback Query
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - DEFAULT_CONFIG.candidateLookbackDays);

    const query = {
      isArchived: false,
      createdAt: { $gte: lookbackDate }
    };

    // Exclude confirmed child duplicates so only primary/standalone complaints are suggested
    query.isDuplicate = { $ne: true };

    // Exclude specified complaint if updating an existing one
    if (excludeComplaintId && mongoose.Types.ObjectId.isValid(excludeComplaintId)) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeComplaintId) };
    }

    // Query candidates within configured limit to avoid table scans
    const candidates = await Complaint.find(query)
      .select('_id ticketNumber title description category priority status customer createdAt')
      .sort({ createdAt: -1 })
      .limit(DEFAULT_CONFIG.maxCandidates)
      .lean();

    const matches = findDuplicates(
      {
        title: title.trim(),
        description: (description || '').trim(),
        category: category || undefined
      },
      candidates
    );

    // Apply strict privacy and role-based data projection
    const sanitizedMatches = matches.map((match) => {
      const c = match.complaint;
      const isOwner = req.user && c.customer && c.customer.toString() === req.user._id.toString();
      const isPrivileged = req.user && (req.user.role === 'admin' || req.user.role === 'staff');
      const canView = Boolean(isOwner || isPrivileged);

      return {
        complaintId: canView ? c._id : undefined,
        ticketNumber: c.ticketNumber,
        category: c.category,
        status: c.status,
        createdAt: c.createdAt,
        similarityScore: match.score,
        matchedTerms: match.matchedTerms,
        reasons: match.reasons,
        canView,
        // Privacy protection: Only show full title to owner or staff/admin. For other customers, truncate/sanitize.
        title: canView
          ? c.title
          : (c.title.length > 40 ? `${c.title.slice(0, 40)}...` : c.title)
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        matches: sanitizedMatches,
        totalFound: sanitizedMatches.length,
        threshold: DEFAULT_CONFIG.minSimilarityThreshold,
        lookbackDays: DEFAULT_CONFIG.candidateLookbackDays
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get duplicate suggestions for an existing complaint
 * GET /api/v1/complaints/:id/duplicate-suggestions
 */
const getDuplicateSuggestions = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        status: 'fail',
        message: 'Complaint not found.'
      });
    }

    // Ownership & Authorization check
    if (
      req.user.role === 'customer' &&
      complaint.customer.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        status: 'fail',
        message: 'Forbidden: You do not have permission to view suggestions for this complaint.'
      });
    }

    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - DEFAULT_CONFIG.candidateLookbackDays);

    const candidates = await Complaint.find({
      _id: { $ne: complaint._id },
      isArchived: false,
      isDuplicate: { $ne: true },
      createdAt: { $gte: lookbackDate }
    })
      .select('_id ticketNumber title description category priority status customer createdAt')
      .sort({ createdAt: -1 })
      .limit(DEFAULT_CONFIG.maxCandidates)
      .lean();

    const matches = findDuplicates(
      {
        title: complaint.title,
        description: complaint.description,
        category: complaint.category
      },
      candidates
    );

    const sanitizedMatches = matches.map((match) => {
      const c = match.complaint;
      const isOwner = c.customer && c.customer.toString() === req.user._id.toString();
      const isPrivileged = req.user.role === 'admin' || req.user.role === 'staff';
      const canView = Boolean(isOwner || isPrivileged);

      return {
        complaintId: canView ? c._id : undefined,
        ticketNumber: c.ticketNumber,
        category: c.category,
        status: c.status,
        createdAt: c.createdAt,
        similarityScore: match.score,
        matchedTerms: match.matchedTerms,
        reasons: match.reasons,
        canView,
        title: canView
          ? c.title
          : (c.title.length > 40 ? `${c.title.slice(0, 40)}...` : c.title)
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        matches: sanitizedMatches,
        totalFound: sanitizedMatches.length,
        threshold: DEFAULT_CONFIG.minSimilarityThreshold
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Confirm and link a complaint as a duplicate of a primary complaint
 * POST /api/v1/complaints/:id/mark-duplicate
 * Authorized: Staff, Admin
 */
const markAsDuplicate = async (req, res, next) => {
  try {
    const { primaryComplaintId, reason } = req.body;

    if (!primaryComplaintId || !mongoose.Types.ObjectId.isValid(primaryComplaintId)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Valid primaryComplaintId is required.'
      });
    }

    // 1) Prevent self-linking
    if (req.params.id.toString() === primaryComplaintId.toString()) {
      return res.status(400).json({
        status: 'fail',
        message: 'A complaint cannot be marked as a duplicate of itself.'
      });
    }

    // 2) Verify both complaints exist and are not archived
    const [targetComplaint, primaryComplaint] = await Promise.all([
      Complaint.findById(req.params.id),
      Complaint.findById(primaryComplaintId)
    ]);

    if (!targetComplaint || targetComplaint.isArchived) {
      return res.status(404).json({
        status: 'fail',
        message: 'Target complaint not found or is archived.'
      });
    }

    if (!primaryComplaint || primaryComplaint.isArchived) {
      return res.status(404).json({
        status: 'fail',
        message: 'Primary complaint not found or is archived.'
      });
    }

    // 3) Prevent duplicate relationship records
    if (targetComplaint.isDuplicate && targetComplaint.duplicateOf?.toString() === primaryComplaint._id.toString()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Complaint is already confirmed as a duplicate of this primary ticket.'
      });
    }

    // 4) Prevent circular relationships & multi-level nesting
    if (primaryComplaint.isDuplicate) {
      return res.status(400).json({
        status: 'fail',
        message: `Cannot link to #${primaryComplaint.ticketNumber} because it is already marked as a duplicate. Please link directly to its primary complaint.`
      });
    }

    // If target complaint has complaints pointing to it, prevent turning it into a duplicate
    const childDuplicatesCount = await Complaint.countDocuments({ duplicateOf: targetComplaint._id });
    if (childDuplicatesCount > 0) {
      return res.status(400).json({
        status: 'fail',
        message: `Cannot mark #${targetComplaint.ticketNumber} as a duplicate because other tickets are already linked to it as their primary.`
      });
    }

    // 5) Update target complaint
    const trimmedReason = (reason || '').trim();
    targetComplaint.isDuplicate = true;
    targetComplaint.duplicateOf = primaryComplaint._id;
    targetComplaint.duplicateReason = trimmedReason;
    targetComplaint.duplicateMarkedBy = req.user._id;
    targetComplaint.duplicateMarkedAt = new Date();

    // Add informative note to complaint
    targetComplaint.notes.push({
      author: req.user._id,
      note: `Marked as confirmed duplicate of Ticket #${primaryComplaint.ticketNumber} ("${primaryComplaint.title}"). Reason: ${trimmedReason || 'Duplicate customer submission'}`,
      isInternal: false,
      createdAt: new Date()
    });

    await targetComplaint.save();

    // 6) Audit Log
    await recordAudit({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'COMPLAINT_DUPLICATE_LINKED',
      resourceType: 'Complaint',
      resourceId: targetComplaint._id,
      description: `Complaint #${targetComplaint.ticketNumber} confirmed as duplicate of #${primaryComplaint.ticketNumber}`,
      changes: {
        isDuplicate: true,
        duplicateOf: primaryComplaint.ticketNumber,
        primaryId: primaryComplaint._id,
        reason: trimmedReason
      },
      req
    }).catch((err) => console.error('Audit log error (duplicate link):', err.message));

    const populatedTarget = await Complaint.findById(targetComplaint._id)
      .populate('duplicateOf', 'ticketNumber title status category customer')
      .populate('duplicateMarkedBy', 'name role');

    res.status(200).json({
      status: 'success',
      message: `Complaint #${targetComplaint.ticketNumber} linked as duplicate of #${primaryComplaint.ticketNumber}.`,
      data: {
        complaint: populatedTarget
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove confirmed duplicate relationship
 * DELETE /api/v1/complaints/:id/mark-duplicate
 * Authorized: Staff, Admin
 */
const unmarkDuplicate = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        status: 'fail',
        message: 'Complaint not found.'
      });
    }

    if (!complaint.isDuplicate) {
      return res.status(400).json({
        status: 'fail',
        message: 'This complaint is not currently marked as a duplicate.'
      });
    }

    const previousPrimaryId = complaint.duplicateOf;

    complaint.isDuplicate = false;
    complaint.duplicateOf = null;
    complaint.duplicateReason = '';
    complaint.duplicateMarkedBy = null;
    complaint.duplicateMarkedAt = null;

    complaint.notes.push({
      author: req.user._id,
      note: 'Duplicate relationship removed. Ticket restored to independent investigation.',
      isInternal: false,
      createdAt: new Date()
    });

    await complaint.save();

    // Audit Log
    await recordAudit({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'COMPLAINT_DUPLICATE_UNLINKED',
      resourceType: 'Complaint',
      resourceId: complaint._id,
      description: `Duplicate relationship removed from #${complaint.ticketNumber}`,
      changes: {
        isDuplicate: false,
        previousPrimaryId
      },
      req
    }).catch((err) => console.error('Audit log error (duplicate unlink):', err.message));

    res.status(200).json({
      status: 'success',
      message: `Duplicate relationship removed for complaint #${complaint.ticketNumber}.`,
      data: {
        complaint
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve duplicate metrics and analytics for Admin
 * GET /api/v1/complaints/stats/duplicates
 * Authorized: Admin
 */
const getDuplicateAnalytics = async (req, res, next) => {
  try {
    // 1) Total complaints and confirmed duplicates count
    const [totalComplaints, totalDuplicates] = await Promise.all([
      Complaint.countDocuments({ isArchived: false }),
      Complaint.countDocuments({ isArchived: false, isDuplicate: true })
    ]);

    const duplicateRate = totalComplaints > 0
      ? Math.round((totalDuplicates / totalComplaints) * 1000) / 10
      : 0;

    // 2) Most common duplicate categories
    const duplicatesByCategory = await Complaint.aggregate([
      { $match: { isArchived: false, isDuplicate: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { category: '$_id', count: 1, _id: 0 } }
    ]);

    // 3) Duplicates grouped by month (last 6 months)
    const duplicatesByMonth = await Complaint.aggregate([
      {
        $match: {
          isArchived: false,
          isDuplicate: true,
          createdAt: {
            $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { month: '$_id', count: 1, _id: 0 } }
    ]);

    // 4) Primary complaints with multiple duplicates
    const primaryWithMultipleDuplicates = await Complaint.aggregate([
      { $match: { isArchived: false, isDuplicate: true, duplicateOf: { $ne: null } } },
      { $group: { _id: '$duplicateOf', count: { $sum: 1 } } },
      { $match: { count: { $gte: 2 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'complaints',
          localField: '_id',
          foreignField: '_id',
          as: 'primaryComplaint'
        }
      },
      { $unwind: '$primaryComplaint' },
      {
        $project: {
          primaryId: '$_id',
          ticketNumber: '$primaryComplaint.ticketNumber',
          title: '$primaryComplaint.title',
          category: '$primaryComplaint.category',
          duplicateCount: '$count',
          _id: 0
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        totalDuplicates,
        totalComplaints,
        duplicateRate,
        duplicatesByCategory,
        duplicatesByMonth,
        primaryWithMultipleDuplicates,
        multiDuplicatePrimariesCount: primaryWithMultipleDuplicates.length
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkDuplicates,
  getDuplicateSuggestions,
  markAsDuplicate,
  unmarkDuplicate,
  getDuplicateAnalytics
};

const mongoose = require('mongoose');
const Feedback = require('../models/Feedback');
const Complaint = require('../models/Complaint');
const { createNotification } = require('../services/notificationService');

/**
 * Submit feedback and star rating for a resolved complaint
 * POST /api/v1/complaints/:id/feedback
 */
const submitFeedback = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid complaint ID format.'
      });
    }

    // 1) Validate Rating (must be integer between 1 and 5)
    const numRating = Number(rating);
    if (!rating || !Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        status: 'fail',
        message: 'Rating must be an integer between 1 and 5.'
      });
    }

    // 2) Find Complaint
    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({
        status: 'fail',
        message: 'Complaint not found.'
      });
    }

    // 3) Ownership Verification: Only complaint owner can submit feedback
    if (complaint.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'Forbidden: Only the customer who owns this complaint may submit feedback.'
      });
    }

    // 4) Status Verification: Only RESOLVED or CLOSED complaints accept feedback
    if (complaint.status !== 'RESOLVED' && complaint.status !== 'CLOSED') {
      return res.status(400).json({
        status: 'fail',
        message: 'Feedback can only be submitted for resolved complaints.'
      });
    }

    // 5) Prevent Duplicate Submissions
    const existingFeedback = await Feedback.findOne({ complaint: complaint._id });
    if (existingFeedback) {
      return res.status(400).json({
        status: 'fail',
        message: 'Feedback has already been submitted for this complaint.'
      });
    }

    // 6) Create Feedback Record in MongoDB
    const feedback = await Feedback.create({
      complaint: complaint._id,
      customer: req.user._id,
      rating: numRating,
      comment: (comment || '').trim()
    });

    const populated = await Feedback.findById(feedback._id)
      .populate('customer', 'name email')
      .populate('complaint', 'ticketNumber title');

    // 7) Dispatch real-time alert to assigned staff member if present
    if (complaint.assignedTo) {
      createNotification({
        recipient: complaint.assignedTo,
        complaint: complaint._id,
        type: 'SYSTEM_ALERT',
        title: 'Customer Feedback Received',
        message: `Customer rated complaint #${complaint.ticketNumber}: ${numRating} stars.`
      }).catch((err) => console.error('Feedback notification error:', err.message));
    }

    res.status(201).json({
      status: 'success',
      message: 'Thank you for your feedback! Your rating has been recorded.',
      data: {
        feedback: populated
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'fail',
        message: 'Feedback has already been submitted for this complaint.'
      });
    }
    next(error);
  }
};

/**
 * Get feedback associated with a complaint (authorized participants only)
 * GET /api/v1/complaints/:id/feedback
 */
const getFeedbackByComplaint = async (req, res, next) => {
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
        message: 'Complaint not found.'
      });
    }

    // Access control: customer can only view their own complaint's feedback
    if (
      req.user.role === 'customer' &&
      complaint.customer.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        status: 'fail',
        message: 'Forbidden: You cannot view feedback for another customer\'s complaint.'
      });
    }

    const feedback = await Feedback.findOne({ complaint: complaint._id })
      .populate('customer', 'name email')
      .populate('complaint', 'ticketNumber title status');

    res.status(200).json({
      status: 'success',
      data: {
        feedback: feedback || null
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Optionally update customer feedback (Owner only)
 * PATCH /api/v1/complaints/:id/feedback
 */
const updateFeedback = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid complaint ID format.'
      });
    }

    const feedback = await Feedback.findOne({ complaint: id });
    if (!feedback) {
      return res.status(404).json({
        status: 'fail',
        message: 'Feedback not found for this complaint.'
      });
    }

    if (feedback.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'Forbidden: Only the author can update this feedback.'
      });
    }

    if (rating !== undefined) {
      const numRating = Number(rating);
      if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
        return res.status(400).json({
          status: 'fail',
          message: 'Rating must be an integer between 1 and 5.'
        });
      }
      feedback.rating = numRating;
    }

    if (comment !== undefined) {
      feedback.comment = comment.trim();
    }

    await feedback.save();

    const updated = await Feedback.findById(feedback._id)
      .populate('customer', 'name email')
      .populate('complaint', 'ticketNumber title');

    res.status(200).json({
      status: 'success',
      message: 'Feedback updated successfully.',
      data: {
        feedback: updated
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * System-wide customer satisfaction and feedback analytics (Admin only)
 * GET /api/v1/feedback/analytics
 */
const getFeedbackAnalytics = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'fail',
        message: 'Forbidden: Admin privilege required to view feedback analytics.'
      });
    }

    const [totalFeedback, avgResult, distributionResult, recentFeedback] = await Promise.all([
      Feedback.countDocuments(),
      Feedback.aggregate([
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' }
          }
        }
      ]),
      Feedback.aggregate([
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 }
          }
        }
      ]),
      Feedback.find()
        .populate('customer', 'name email')
        .populate('complaint', 'ticketNumber title priority category')
        .sort({ createdAt: -1 })
        .limit(10)
    ]);

    const averageRating =
      avgResult.length > 0 && avgResult[0].averageRating
        ? Math.round(avgResult[0].averageRating * 10) / 10
        : 0;

    // Build distribution map { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distributionResult.forEach((item) => {
      if (item._id >= 1 && item._id <= 5) {
        ratingDistribution[item._id] = item.count;
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        totalFeedback,
        averageRating,
        ratingDistribution,
        recentFeedback
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitFeedback,
  getFeedbackByComplaint,
  updateFeedback,
  getFeedbackAnalytics
};

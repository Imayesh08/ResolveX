const mongoose = require('mongoose');

const VALID_CATEGORIES = [
  'Technical Issue',
  'Billing and Payment',
  'Product or Service',
  'Account Access',
  'Delivery',
  'Other'
];

const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const VALID_STATUSES = [
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'WAITING_FOR_CUSTOMER',
  'RESOLVED',
  'CLOSED'
];

/**
 * Validate Complaint Creation Payload
 */
const validateCreateComplaint = (req, res, next) => {
  const { title, description, category, priority } = req.body;
  const errors = [];

  if (!title || typeof title !== 'string' || title.trim().length < 5 || title.trim().length > 120) {
    errors.push('Title is required and must be between 5 and 120 characters.');
  }

  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    errors.push('Detailed description is required and must be at least 10 characters long.');
  }

  if (!category || !VALID_CATEGORIES.includes(category)) {
    errors.push(`Category must be one of: ${VALID_CATEGORIES.join(', ')}.`);
  }

  if (priority && !VALID_PRIORITIES.includes(priority)) {
    errors.push(`Priority must be one of: ${VALID_PRIORITIES.join(', ')}.`);
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'fail',
      message: 'Validation error',
      errors: errors
    });
  }

  next();
};

/**
 * Validate Status Update Payload
 */
const validateUpdateStatus = (req, res, next) => {
  const { status, notes, resolutionDescription } = req.body;
  const errors = [];

  if (!status || !VALID_STATUSES.includes(status)) {
    errors.push(`Status must be one of: ${VALID_STATUSES.join(', ')}.`);
  }

  if (status === 'RESOLVED' && (!resolutionDescription || resolutionDescription.trim().length < 5)) {
    errors.push('Resolution description is required when marking a complaint as RESOLVED (minimum 5 characters).');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'fail',
      message: 'Validation error',
      errors: errors
    });
  }

  next();
};

/**
 * Validate Complaint Note Payload
 */
const validateAddNote = (req, res, next) => {
  const { note } = req.body;

  if (!note || typeof note !== 'string' || note.trim().length < 2) {
    return res.status(400).json({
      status: 'fail',
      message: 'Validation error',
      errors: ['Note content cannot be empty (minimum 2 characters).']
    });
  }

  next();
};

/**
 * Validate MongoDB ObjectId in URL params
 */
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      status: 'fail',
      message: `Invalid complaint ID format: '${req.params.id}'. Expected a 24-character hexadecimal MongoDB ObjectId.`
    });
  }
  next();
};

module.exports = {
  validateCreateComplaint,
  validateUpdateStatus,
  validateAddNote,
  validateObjectId,
  VALID_CATEGORIES,
  VALID_PRIORITIES,
  VALID_STATUSES
};

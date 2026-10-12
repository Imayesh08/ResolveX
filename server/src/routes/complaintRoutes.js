const express = require('express');
const router = express.Router();

const complaintController = require('../controllers/complaintController');
const feedbackController = require('../controllers/feedbackController');
const auditController = require('../controllers/auditController');
const attachmentController = require('../controllers/attachmentController');
const duplicateController = require('../controllers/duplicateController');
const { uploadMultiple, uploadRateLimiter } = require('../middleware/uploadMiddleware');
const { protect, authorize } = require('../middleware/auth');
const {
  validateCreateComplaint,
  validateUpdateStatus,
  validateAddNote,
  validateObjectId
} = require('../validators/complaintValidator');

// All complaint routes require authentication
router.use(protect);

// Analytics and statistical summary (Admin and Support Staff)
router.get('/stats/overview', authorize('admin', 'staff'), complaintController.getComplaintStats);
router.get('/stats/duplicates', authorize('admin'), duplicateController.getDuplicateAnalytics);

// Duplicate Complaint Pre-Check Endpoint
router.post('/check-duplicates', duplicateController.checkDuplicates);

// List and Create Complaints
router.route('/')
  .get(complaintController.getAllComplaints)
  .post(validateCreateComplaint, complaintController.createComplaint);

// Single Complaint Inspection and Core Updates
router.route('/:id')
  .get(validateObjectId, complaintController.getComplaintById)
  .patch(validateObjectId, complaintController.updateComplaint)
  .delete(validateObjectId, authorize('admin'), complaintController.archiveComplaint);

// Staff Assignment (Admin only)
router.patch('/:id/assign', validateObjectId, authorize('admin'), complaintController.assignComplaint);

// Status Transitions & Resolution Workflow (Staff, Admin, Reopen by Customer)
router.patch('/:id/status', validateObjectId, validateUpdateStatus, complaintController.updateStatus);

// Internal and External Notes / Activity Records
router.post('/:id/notes', validateObjectId, validateAddNote, complaintController.addNote);

// Complaint Audit Trail & Timeline History
router.get('/:id/audit-trail', validateObjectId, auditController.getComplaintAuditTrail);

// Complaint Evidence & Attachments Subsystem
router.route('/:id/attachments')
  .post(validateObjectId, uploadRateLimiter, uploadMultiple, attachmentController.uploadAttachments)
  .get(validateObjectId, attachmentController.getAttachments);

router.route('/:id/attachments/:attachmentId')
  .get(validateObjectId, attachmentController.getAttachmentFile)
  .delete(validateObjectId, attachmentController.deleteAttachment);

// Duplicate Complaint Suggestions and Management
router.get('/:id/duplicate-suggestions', validateObjectId, duplicateController.getDuplicateSuggestions);
router.route('/:id/mark-duplicate')
  .post(validateObjectId, authorize('admin', 'staff'), duplicateController.markAsDuplicate)
  .delete(validateObjectId, authorize('admin', 'staff'), duplicateController.unmarkDuplicate);

// Customer Feedback and Ratings for Resolved Complaints
router.route('/:id/feedback')
  .post(validateObjectId, feedbackController.submitFeedback)
  .get(validateObjectId, feedbackController.getFeedbackByComplaint)
  .patch(validateObjectId, feedbackController.updateFeedback);

module.exports = router;

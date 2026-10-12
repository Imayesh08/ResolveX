const express = require('express');
const { getFeedbackAnalytics } = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Admin-only customer feedback & CSAT analytics
router.get('/analytics', authorize('admin'), getFeedbackAnalytics);

module.exports = router;

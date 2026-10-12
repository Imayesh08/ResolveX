const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { protect, authorize } = require('../middleware/auth');

// All audit log endpoints require admin privileges
router.use(protect);
router.use(authorize('admin'));

// System audit metrics overview
router.get('/metrics', auditController.getAuditMetrics);

// Paginated and filterable system-wide audit logs
router.get('/', auditController.getAuditLogs);

// Append-only guarantee: reject any write, update, or delete operations
const methodNotAllowed = (req, res) => {
  res.status(405).json({
    status: 'fail',
    message: 'Audit logs are immutable and append-only. Modification and deletion are prohibited.'
  });
};

router.post('/', methodNotAllowed);
router.put('*', methodNotAllowed);
router.patch('*', methodNotAllowed);
router.delete('*', methodNotAllowed);

module.exports = router;

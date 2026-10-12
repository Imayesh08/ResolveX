const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// All user management routes require valid authentication
router.use(protect);

// Staff lookup (accessible by Admin and Support Staff for assignments)
router.get('/staff', authorize('admin', 'staff'), userController.getStaffList);

// Admin-only user management routes
router.get('/', authorize('admin'), userController.getAllUsers);
router.post('/', authorize('admin'), userController.createUser);
router.get('/:id', userController.getUserById);
router.patch('/:id', authorize('admin'), userController.updateUser);
router.delete('/:id', authorize('admin'), userController.deleteUser);

module.exports = router;

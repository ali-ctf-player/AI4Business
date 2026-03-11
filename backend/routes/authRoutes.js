const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// --- NEW: Import Auth Middlewares ---
const { protect, authorize } = require('../middleware/authMiddleware');

// Define the post routes directly from the controller object
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/quick-demo', authController.quickDemoLogin);

// --- NEW: User Management Routes (Now Secured) ---
// We added protect to require a login, and authorize to require admin/superadmin roles
router.get('/users', protect, authorize('admin', 'superadmin'), authController.getAllUsers);
router.put('/users/:id/toggle', protect, authorize('admin', 'superadmin'), authController.toggleUserStatus);

module.exports = router;

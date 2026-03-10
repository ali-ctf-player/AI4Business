const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Define the post routes directly from the controller object
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/quick-demo', authController.quickDemoLogin);

// --- NEW: User Management Routes ---
router.get('/users', authController.getAllUsers);
router.put('/users/:id/toggle', authController.toggleUserStatus);

module.exports = router;

const express = require('express');
const router = express.Router();

// --- NEW: Added updateStartupProfile to the imports ---
const { 
  createStartup, 
  getAllStartups, 
  updateStartupStatus, 
  updateStartupProfile 
} = require('../controllers/startupController');

const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, authorize('startup'), createStartup);
router.get('/', protect, getAllStartups);

// Admin-only status updates (This was already secure)
router.patch('/:id/status', protect, authorize('admin', 'superadmin'), updateStartupStatus);

// --- NEW: Secure Profile Update Route ---
// Requires a valid JWT token. The controller strictly verifies that the user owns this specific startup ID.
router.patch('/:id', protect, updateStartupProfile);

module.exports = router;

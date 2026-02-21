const express = require('express');
const router = express.Router();
const { createStartup, getAllStartups, updateStartupStatus } = require('../controllers/startupController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, authorize('startup'), createStartup);
router.get('/', protect, getAllStartups);
router.patch('/:id/status', protect, authorize('admin', 'superadmin'), updateStartupStatus);

module.exports = router;

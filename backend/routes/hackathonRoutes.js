const express = require('express');
const router = express.Router();
const hackathonController = require('../controllers/hackathonController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Bütün hackathonları gətir (Xəritə və Siyahı üçün)
router.get('/', hackathonController.getAllHackathons);

// Yeni Hackathon yarat (Admin, Organizer, IT Company)
router.post('/', protect, authorize('admin', 'organizer', 'judge'), hackathonController.createHackathon);

module.exports = router;

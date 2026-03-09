const express = require('express');
const router = express.Router();
const Hackathon = require('../models/Hackathon');
const { protect, authorize } = require('../middleware/authMiddleware');

// Bütün hackathonları gətir (Xəritə və Siyahı üçün)
router.get('/', async (req, res) => {
  try {
    const hackathons = await Hackathon.find({ status: { $ne: 'completed' } });
    res.json(hackathons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Yeni Hackathon yarat (Admin, Organizer, IT Company)
router.post('/', protect, authorize('admin', 'organizer', 'judge'), async (req, res) => {
  try {
    const newHackathon = new Hackathon({ ...req.body, createdBy: req.user.id });
    const saved = await newHackathon.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;

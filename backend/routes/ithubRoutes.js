// ~/Downloads/AI4Business/backend/routes/ithubRoutes.js
const express = require('express');
const router = express.Router();
const ItHub = require('../models/ItHub');

// GET all IT Hubs
router.get('/', async (req, res) => {
  try {
    const hubs = await ItHub.find();
    res.json(hubs);
  } catch (err) {
    res.status(500).json({ message: 'Server Error loading IT Hubs' });
  }
});

module.exports = router;

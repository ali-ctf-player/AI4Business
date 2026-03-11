const express = require('express');
const router = express.Router();

// --- NEW: Import Auth Middleware ---
const { protect } = require('../middleware/authMiddleware');

// Import all 6 AI feature controllers
const { 
  askEcosystemAdvisor,
  examineProduct,
  analyzeStartup,
  matchTeam,
  generatePitch,
  scoreRisk
} = require('../controllers/aiController');

// Map the routes to the correct frontend requests
// Added the 'protect' middleware to prevent unauthorized API billing exhaustion
router.post('/ask', protect, askEcosystemAdvisor); // Kept '/ask' so your current chat doesn't break!
router.post('/examine', protect, examineProduct);
router.post('/analyze-startup', protect, analyzeStartup);
router.post('/match-team', protect, matchTeam);
router.post('/generate-pitch', protect, generatePitch);
router.post('/score-risk', protect, scoreRisk);

module.exports = router;

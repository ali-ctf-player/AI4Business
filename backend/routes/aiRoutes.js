const express = require('express');
const router = express.Router();

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
router.post('/ask', askEcosystemAdvisor); // Kept '/ask' so your current chat doesn't break!
router.post('/examine', examineProduct);
router.post('/analyze-startup', analyzeStartup);
router.post('/match-team', matchTeam);
router.post('/generate-pitch', generatePitch);
router.post('/score-risk', scoreRisk);

module.exports = router;

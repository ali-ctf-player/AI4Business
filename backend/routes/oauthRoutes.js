const express  = require('express');
const router   = express.Router();
const passport = require('../config/passport');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ── GitHub ──────────────────────────────────────────────
router.get('/github',
  passport.authenticate('github', { scope: ['user:email'] })
);
router.get('/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${FRONTEND_URL}?auth_error=github` }),
  (req, res) => {
    const token = passport.makeJWT(req.user);
    const user  = { id: req.user._id, role: req.user.role, fullName: req.user.fullName };
    // Redirect to frontend with token in query — frontend picks it up via onload
    res.redirect(`${FRONTEND_URL}?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
  }
);

// ── Google ──────────────────────────────────────────────
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}?auth_error=google` }),
  (req, res) => {
    const token = passport.makeJWT(req.user);
    const user  = { id: req.user._id, role: req.user.role, fullName: req.user.fullName };
    res.redirect(`${FRONTEND_URL}?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
  }
);

module.exports = router;

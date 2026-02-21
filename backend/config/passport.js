const passport      = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt           = require('jsonwebtoken');
const User          = require('../models/User');

const BACKEND_URL  = process.env.BACKEND_URL  || 'http://localhost:5000';

// ── GitHub ─────────────────────────────────────────────
passport.use(new GitHubStrategy({
  clientID:     process.env.GITHUB_CLIENT_ID     || 'GITHUB_CLIENT_ID',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || 'GITHUB_CLIENT_SECRET',
  callbackURL:  `${BACKEND_URL}/api/auth/github/callback`,
  scope: ['user:email'],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value || `github_${profile.id}@ses.local`;
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        fullName:     profile.displayName || profile.username,
        email,
        passwordHash: 'OAUTH_GITHUB',
        role:         'investor',
        authProvider: 'github',
      });
    }
    done(null, user);
  } catch (e) { done(e, null); }
}));

// ── Google ─────────────────────────────────────────────
passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID     || 'GOOGLE_CLIENT_ID',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'GOOGLE_CLIENT_SECRET',
  callbackURL:  `${BACKEND_URL}/api/auth/google/callback`,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        fullName:     profile.displayName,
        email,
        passwordHash: 'OAUTH_GOOGLE',
        role:         'investor',
        authProvider: 'google',
      });
    }
    done(null, user);
  } catch (e) { done(e, null); }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (e) { done(e, null); }
});

// Helper: generate JWT from user object
passport.makeJWT = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });

module.exports = passport;

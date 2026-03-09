const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { email, password, role, fullName } = req.body;

    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "This email is already registered. Please log in." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      email: email.toLowerCase(),
      passwordHash,
      role,
      fullName,
      authProvider: 'local',
      isVerified: true
    });
    await user.save();

    res.status(201).json({ message: "Registration successful! You can now log in." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ message: "This account uses social login. Please sign in with GitHub or Google." });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Your email is not verified. Please check your inbox." });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
};

exports.quickDemoLogin = async (req, res) => {
  try {
    const { roleSlug } = req.body;
    const allowedDemoRoles = ['startup', 'investor', 'organizer', 'mentor', 'judge', 'compliance', 'manager']; 
    
    if (!allowedDemoRoles.includes(roleSlug)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    let user = await User.findOne({ role: roleSlug });

    if (!user) {
      user = new User({
        email: `demo-${roleSlug}@nexusio.test`,
        passwordHash: "demo_hash",
        role: roleSlug,
        fullName: `${roleSlug.toUpperCase()} Demo`
      });
      await user.save();
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user._id, role: user.role, fullName: user.fullName } });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

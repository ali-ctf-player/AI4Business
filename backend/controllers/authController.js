const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { email, password, role, fullName } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ message: "Email, password and full name are required" });
    }

    const allowedRoles = ['startup', 'investor', 'organizer', 'itcompany', 'it_company', 'incubator'];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ message: `Invalid role: ${role}` });
    }

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ email, passwordHash: hashedPassword, role: role || 'startup', fullName });
    await user.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ error: error.message || "Server error during registration" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const payload = { id: user._id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({ token, user: { id: user._id, role: user.role, fullName: user.fullName } });
  } catch (error) {
    res.status(500).json({ error: "Server error during login" });
  }
};

const Startup = require('../models/Startup');

exports.createStartup = async (req, res) => {
  try {
    const { companyName, industry, stage, pitchDeckUrl } = req.body;
    
    const startup = new Startup({
      founderId: req.user.id, // Set securely from the authenticated token
      companyName,
      industry,
      stage,
      pitchDeckUrl
    });

    await startup.save();
    res.status(201).json(startup);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.getAllStartups = async (req, res) => {
  try {
    const startups = await Startup.find().populate('founderId', 'fullName email');
    res.json(startups);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateStartupStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // This remains secure as long as the route uses authorize('admin', 'superadmin')
    const startup = await Startup.findByIdAndUpdate(
      id,
      { status, reviewedBy: req.user.id },
      { new: true }
    );

    if (!startup) return res.status(404).json({ message: "Startup not found" });
    
    res.json(startup);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// --- NEW: Secure Profile Update for Founders (Mitigates IDOR) ---
exports.updateStartupProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyName, industry, stage, pitchDeckUrl } = req.body;

    const startup = await Startup.findById(id);

    if (!startup) {
      return res.status(404).json({ message: "Startup not found" });
    }

    // 🛑 STRICT OWNERSHIP CHECK: Verify req.user.id matches startup.founderId
    // Note: We use .toString() because MongoDB ObjectIDs are objects, not plain strings.
    if (startup.founderId.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: "Forbidden: You are not authorized to edit this startup." });
    }

    // Update only the allowed fields
    startup.companyName = companyName || startup.companyName;
    startup.industry = industry || startup.industry;
    startup.stage = stage || startup.stage;
    startup.pitchDeckUrl = pitchDeckUrl || startup.pitchDeckUrl;

    await startup.save();
    
    res.json(startup);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

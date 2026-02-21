const Startup = require('../models/Startup');

exports.createStartup = async (req, res) => {
  try {
    const { companyName, industry, stage, pitchDeckUrl } = req.body;
    
    const startup = new Startup({
      founderId: req.user.id,
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

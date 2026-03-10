const Hackathon = require('../models/Hackathon');

// Bütün hackathonları gətir (Xəritə və Siyahı üçün)
exports.getAllHackathons = async (req, res) => {
  try {
    const hackathons = await Hackathon.find({ status: { $ne: 'completed' } }).sort({ createdAt: -1 });
    
    // Convert Mongoose documents to plain objects and map _id to id 
    // so the frontend JavaScript can read the IDs properly
    const formattedHackathons = hackathons.map(h => ({
      ...h.toObject(),
      id: h._id
    }));

    res.json(formattedHackathons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Yeni Hackathon yarat (Admin, Organizer, IT Company)
exports.createHackathon = async (req, res) => {
  try {
    const newHackathon = new Hackathon({ 
      ...req.body, 
      createdBy: req.user.id 
    });
    
    const saved = await newHackathon.save();
    
    // Format response to include the mapped id
    const responseObj = saved.toObject();
    responseObj.id = responseObj._id;

    res.status(201).json(responseObj);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
